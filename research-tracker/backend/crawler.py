"""arXiv paper crawler - uses arXiv REST API (no arxiv/feedparser, Python 3.13+ compatible)."""
import logging
import urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
import sqlite3
import threading
import requests

from database import get_connection, init_db, load_crawl_keywords
from tagging import (
    tag_paper,
    tags_to_str,
    str_to_tags,
    BUSINESS_TAGS,
    PAPER_TAG_KEYWORDS,
    THREEDGS_KEYWORDS,
    THREEDGS_REQUIRED_TAGS,
    SEARCH_WITHOUT_3DGS_PREFIX,
)

log = logging.getLogger(__name__)
ARXIV_API = "http://export.arxiv.org/api/query"

# arXiv 按关键词搜索：轮询取词，确保每个研究方向都有代表关键词参与抓取
def _build_search_keywords(max_count: int = 60) -> list[str]:
    """Round-robin: 每个标签轮流贡献关键词，保证各研究方向均衡覆盖。"""
    keywords_by_tag = list(PAPER_TAG_KEYWORDS.items())
    result = []
    idx = 0
    while len(result) < max_count:
        added = False
        for _tag, kws in keywords_by_tag:
            if idx < len(kws):
                k = kws[idx].strip()
                if len(k) >= 3 and k not in result:
                    result.append(k)
                    added = True
                    if len(result) >= max_count:
                        break
        if not added:
            break
        idx += 1
    return result


ARXIV_SEARCH_KEYWORDS = _build_search_keywords(60)
ARXIV_NS = {"atom": "http://www.w3.org/2005/Atom"}
# 已去掉分类限制，不再限定 cs.CV/cs.LG 等

OPENREVIEW_API = "https://api.openreview.net/notes"
OPENREVIEW_API_V2 = "https://api2.openreview.net/notes"
OPENREVIEW_HEADERS = {"User-Agent": "ResearchTracker/1.0"}
# (venue_id, display_name) - 使用 invitation 查询（content.venueid 实测返回空）
# API v2 格式: {venue_id}/-/Submission; 部分旧会议用 Blind_Submission
# ICLR/NeurIPS 可用 openreview-py 获取；CVF (CVPR/ICCV/ECCV) 在 OpenReview 上可能受限
# 仅抓取 2025 及以后的会议
OPENREVIEW_VENUES = [
    ("ICLR.cc/2025/Conference", "ICLR 2025 Conference"),
    ("NeurIPS.cc/2025/Conference", "NeurIPS 2025 Conference"),
    ("thecvf.com/CVPR/2025/Conference", "CVPR 2025 Conference"),
    ("thecvf.com/ICCV/2025/Conference", "ICCV 2025 Conference"),
]

S2_API = "https://api.semanticscholar.org/graph/v1/paper/search"
S2_FIELDS = "paperId,title,abstract,authors,publicationDate,year,venue,publicationVenue,citationCount,externalIds,url"
S2_EARLY_EXIT = 250  # 达到此数量即停止，避免跑完所有关键词，提速且不牺牲覆盖
S2_WORKERS = 3  # 并行请求数，避免触发 S2 限流（100 次/5 分钟）
S2_TIMEOUT = 30
S2_DEFAULT_QUERIES = [
    "3D vision",
    "world model",
    "\"3D Gaussian Splatting\"",
    "3DGS",
    "4D Gaussian Splatting",
    "physics simulation",
    "MPM physics",
    "embodied AI",
    "scene understanding",
    "diffusion model 3D",
    "virtual reality",
    "augmented reality",
    "relighting",
    "inverse rendering",
    "svbrdf",
    "reflectance decomposition",
    "3D reconstruction",
    "3D generation",
    "human avatar",
    "character animation",
    "Gaussian splatting editing",
    "editable gaussian",
    "3D scene editing gaussian",
    "underwater 3D reconstruction",
    "underwater gaussian splatting",
    "3D scene understanding",
    "open-vocabulary 3D",
]


def _parse_entry(entry) -> dict | None:
    """Parse an Atom entry element into a paper dict."""
    def text(elem, tag):
        e = elem.find(f"atom:{tag}", ARXIV_NS)
        return e.text.strip() if e is not None and e.text else ""

    def find_link(entry, rel):
        for link in entry.findall("atom:link", ARXIV_NS):
            if link.get("rel") == rel:
                return link.get("href", "")
        return ""

    id_elem = entry.find("atom:id", ARXIV_NS)
    if id_elem is None or not id_elem.text:
        return None
    arxiv_id = id_elem.text.strip().split("/")[-1]

    published = entry.find("atom:published", ARXIV_NS)
    published_at = published.text.strip() if published is not None and published.text else None

    authors = [a.find("atom:name", ARXIV_NS) for a in entry.findall("atom:author", ARXIV_NS)]
    authors_str = ", ".join(a.text.strip() for a in authors if a is not None and a.text)

    categories = [c.get("term", "") for c in entry.findall("atom:category", ARXIV_NS)]
    categories_str = ", ".join(categories)

    pdf_url = find_link(entry, "related") or f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    arxiv_url = f"https://arxiv.org/abs/{arxiv_id}"

    return {
        "id": arxiv_id,
        "title": text(entry, "title").replace("\n", " "),
        "abstract": text(entry, "summary").replace("\n", " "),
        "authors": authors_str,
        "categories": categories_str,
        "pdf_url": pdf_url,
        "arxiv_url": arxiv_url,
        "published_at": published_at,
        "source": "arxiv",
        "doi": None,
        "url": arxiv_url,
        "affiliations": "",
        "keywords": "",
        "updated_at": None,
    }


def _build_arxiv_keyword_query(keywords: list[str], batch_size: int = 6) -> list[str]:
    """Build arXiv search_query strings: (all:kw1+OR+...). 无分类限制。"""
    queries = []
    for i in range(0, len(keywords), batch_size):
        batch = keywords[i : i + batch_size]
        terms = []
        for kw in batch:
            if " " in kw:
                terms.append(f'all:"{kw.replace(" ", "+")}"')
            else:
                terms.append(f"all:{kw}")
        kw_part = "+OR+".join(terms)
        queries.append(f"({kw_part})")
    return queries


def _build_tag_query(keywords: list[str], require_3dgs: bool = False) -> str:
    """Build single arXiv query from a tag's keywords (OR). require_3dgs: 添加 3dgs 约束（AND 条件）。无分类限制。"""
    terms = []
    for kw in keywords:
        k = kw.strip()
        if len(k) < 3:
            continue
        if " " in k:
            terms.append(f'all:"{k.replace(" ", "+")}"')
        else:
            terms.append(f"all:{k}")
    if not terms:
        return ""
    kw_part = "+OR+".join(terms)
    if require_3dgs:
        gs_terms = []
        for k in THREEDGS_KEYWORDS:
            k = k.strip()
            if len(k) < 3:
                continue
            if " " in k:
                gs_terms.append(f'all:"{k.replace(" ", "+")}"')
            else:
                gs_terms.append(f"all:{k}")
        if gs_terms:
            gs_part = "+OR+".join(gs_terms)
            return f"({kw_part})+AND+({gs_part})"
    return f"({kw_part})"


def _fetch_tag_papers(
    tag: str,
    search_queries: list[str],
    min_per_tag: int,
    max_per_tag: int,
    papers: list,
    seen_ids: set,
    lock: threading.Lock,
    page_size: int = 50,
    max_pages_per_query: int = 3,
    max_queries_per_tag: int = 40,
) -> None:
    """单标签抓取（供并行调用）。每标签至少 min_per_tag 篇，最多 max_per_tag 篇。未达 min 时继续跑更多查询。"""
    tag_count = 0
    for i, search_query in enumerate(search_queries):
        if tag_count >= max_per_tag:
            break
        if i >= max_queries_per_tag and tag_count >= min_per_tag:
            break
        arxiv_start = 0
        for _ in range(max_pages_per_query):
            if tag_count >= max_per_tag:
                break
            params = {
                "search_query": search_query,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "start": arxiv_start,
                "max_results": page_size,
            }
            try:
                r = requests.get(ARXIV_API, params=params, timeout=60)
                r.raise_for_status()
                root = ET.fromstring(r.content)
            except Exception:
                break
            entries = root.findall("atom:entry", ARXIV_NS)
            if not entries:
                break
            for entry in entries:
                p = _parse_entry(entry)
                if not p:
                    continue
                with lock:
                    if p["id"] in seen_ids:
                        continue
                    seen_ids.add(p["id"])
                    papers.append(p)
                tags_list = tag_paper(
                    p.get("title", ""),
                    p.get("abstract", ""),
                    p.get("categories", ""),
                    p.get("keywords", ""),
                    p.get("source", ""),
                    p.get("venue", ""),
                )
                if tag in tags_list:
                    tag_count += 1
                    if tag_count >= max_per_tag:
                        break
            arxiv_start += len(entries)
            if len(entries) < page_size:
                break


def fetch_recent_papers(
    days: int = 15,
    max_results: int = 500,
    min_per_tag: int = 10,
    max_per_tag: int = 50,
    tag: str | None = None,
) -> list[dict]:
    """按标签并行抓取，每标签 min_per_tag～max_per_tag 篇。tag: 选定标签时仅抓取该标签关键词（PAPER_TAG_KEYWORDS）。"""
    papers = []
    seen_ids = set()
    lock = threading.Lock()

    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=days)
    date_range = f"submittedDate:[{start_dt:%Y%m%d%H%M}+TO+{end_dt:%Y%m%d%H%M}]"

    tags_to_fetch = (
        [(tag.strip(), PAPER_TAG_KEYWORDS[tag.strip()])]
        if tag and tag.strip() and tag.strip() in PAPER_TAG_KEYWORDS
        else list(PAPER_TAG_KEYWORDS.items())
    )

    tasks = []
    for t, kws in tags_to_fetch:
        valid_kws = [k for k in kws if len(k.strip()) >= 3]
        if not valid_kws:
            continue
        require_3dgs = t in THREEDGS_REQUIRED_TAGS and t not in SEARCH_WITHOUT_3DGS_PREFIX
        # 每个关键词单独查询，提高冷门标签覆盖
        BATCH_SIZE = 1
        search_queries = []
        for i in range(0, len(valid_kws), BATCH_SIZE):
            batch = valid_kws[i : i + BATCH_SIZE]
            query = _build_tag_query(batch, require_3dgs=require_3dgs)
            if query:
                search_queries.append(f"({query})+AND+{date_range}")
        if not search_queries:
            continue
        tasks.append((t, search_queries))

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(
                _fetch_tag_papers,
                t,
                search_queries,
                min_per_tag,
                max_per_tag,
                papers,
                seen_ids,
                lock,
            ): t
            for t, search_queries in tasks
        }
        for future in as_completed(futures):
            try:
                future.result()
            except Exception:
                pass

    papers.sort(key=lambda x: x["published_at"] or "", reverse=True)
    return papers[:max_results]


def _openreview_val(v):
    """Extract value from OpenReview content field (may be dict with 'value' key)."""
    return v.get("value", v) if isinstance(v, dict) else (v or "")


def _fetch_openreview_via_rest_v2(venue_id: str, venue_name: str, cutoff_ms: int, seen_ids: set, max_results: int) -> list[dict]:
    """Fallback: 直接用 requests 调用 api2.openreview.net/notes，不依赖 openreview-py。"""
    papers = []
    for inv_suffix in ["Submission", "Blind_Submission"]:
        invitation = f"{venue_id}/-/{inv_suffix}"
        offset = 0
        for _ in range(5):  # 最多 5 页
            try:
                r = requests.get(
                    OPENREVIEW_API_V2,
                    params={"invitation": invitation, "limit": min(100, max_results - len(papers)), "offset": offset, "sort": "tcdate:desc"},
                    headers=OPENREVIEW_HEADERS,
                    timeout=60,
                )
                r.raise_for_status()
                data = r.json()
            except Exception as e:
                log.warning("OpenReview API v2 %s: %s", invitation, e)
                break
            notes = data.get("notes", [])
            if not notes:
                break
            for note in notes:
                note_id = note.get("id")
                if not note_id or note_id in seen_ids:
                    continue
                pdate = note.get("pdate") or note.get("cdate") or 0
                if pdate and pdate < cutoff_ms:
                    continue
                content = note.get("content") or {}
                title = _openreview_val(content.get("title") or "")
                abstract = _openreview_val(content.get("abstract") or "")
                authors_raw = content.get("authors") or []
                authors = [_openreview_val(a) if isinstance(a, dict) else str(a) for a in (authors_raw if isinstance(authors_raw, list) else [authors_raw])]
                authors_str = ", ".join(a for a in authors if isinstance(a, str))
                forum_url = f"https://openreview.net/forum?id={note_id}"
                published_at = datetime.fromtimestamp((pdate or 0) / 1000, tz=timezone.utc).isoformat()
                papers.append({
                    "id": f"openreview:{note_id}",
                    "title": title.replace("\n", " "),
                    "abstract": abstract.replace("\n", " "),
                    "authors": authors_str,
                    "categories": venue_name,
                    "pdf_url": f"https://openreview.net/pdf?id={note_id}",
                    "arxiv_url": forum_url,
                    "published_at": published_at,
                    "source": "openreview",
                    "doi": _openreview_val(content.get("doi")) if content.get("doi") else None,
                    "url": forum_url,
                    "affiliations": "",
                    "keywords": "",
                    "updated_at": None,
                })
                seen_ids.add(note_id)
                if len(papers) >= max_results:
                    return papers
            offset += len(notes)
            if len(notes) < 100:
                break
        if papers:
            return papers
    return papers


def _fetch_openreview_via_client(venue_id: str, venue_name: str, cutoff_ms: int, seen_ids: set, max_results: int) -> list[dict]:
    """Use openreview-py client (supports API v2 venues)."""
    try:
        import openreview
    except ImportError as e:
        log.info("openreview-py not installed, will use REST fallback: %s", e)
        return []
    if max_results <= 0:
        return []
    papers = []
    for inv_suffix in ["Submission", "Blind_Submission"]:
        try:
            client = openreview.api.OpenReviewClient(baseurl="https://api2.openreview.net")
            invitation = f"{venue_id}/-/{inv_suffix}"
            notes_iter = client.get_all_notes(invitation=invitation)
            iter_count = 0
            for note in notes_iter:
                iter_count += 1
                if iter_count > 2000:  # 避免遍历过多
                    break
                try:
                    note_id = note.id if hasattr(note, "id") else note.get("id")
                except (KeyError, AttributeError, TypeError):
                    continue
                if not note_id or note_id in seen_ids:
                    continue
                try:
                    pdate = getattr(note, "pdate", None) or getattr(note, "cdate", 0)
                    if isinstance(note, dict):
                        pdate = note.get("pdate") or note.get("cdate", 0)
                    if pdate and pdate < cutoff_ms:
                        continue
                    content = (note.get("content", {}) if isinstance(note, dict) else getattr(note, "content", None)) or {}

                    title = _openreview_val(content.get("title") or "")
                    abstract = _openreview_val(content.get("abstract") or "")
                    authors_raw = content.get("authors")
                    authors = []
                    if isinstance(authors_raw, list):
                        for a in authors_raw:
                            authors.append(_openreview_val(a) if isinstance(a, dict) else str(a))
                    elif authors_raw is not None:
                        authors = [str(authors_raw)]
                    authors_str = ", ".join(a for a in authors if isinstance(a, str))
                    forum_url = f"https://openreview.net/forum?id={note_id}"
                    published_at = datetime.fromtimestamp((pdate or 0) / 1000, tz=timezone.utc).isoformat()
                    papers.append({
                        "id": f"openreview:{note_id}",
                        "title": title.replace("\n", " "),
                        "abstract": abstract.replace("\n", " "),
                        "authors": authors_str,
                        "categories": venue_name,
                        "pdf_url": f"https://openreview.net/pdf?id={note_id}",
                        "arxiv_url": forum_url,
                        "published_at": published_at,
                        "source": "openreview",
                        "doi": _openreview_val(content.get("doi")) if content.get("doi") else None,
                        "url": forum_url,
                        "affiliations": "",
                        "keywords": "",
                        "updated_at": None,
                    })
                    seen_ids.add(note_id)
                    if len(papers) >= max_results:
                        return papers
                except (KeyError, TypeError, AttributeError):
                    continue
            if papers:
                return papers
        except Exception as e:
            log.debug("OpenReview client %s %s: %s", venue_id, inv_suffix, e)
            continue
    return papers


def fetch_openreview_papers(days: int = 15, max_results: int = 500, min_per_venue: int = 10, max_per_venue: int = 50) -> list[dict]:
    """按会议抓取，每会议 min_per_venue～max_per_venue 篇。"""
    papers = []
    seen_ids = set()
    cutoff_ms = int(datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)

    for venue_id, venue_name in OPENREVIEW_VENUES:
        if len(papers) >= max_results:
            break
        venue_quota = min(max_per_venue, max_results - len(papers))
        if venue_quota <= 0:
            break

        # 优先用 openreview-py 客户端（支持 API v2）
        client_papers = _fetch_openreview_via_client(
            venue_id, venue_name, cutoff_ms, seen_ids, venue_quota
        )
        if client_papers:
            papers.extend(client_papers)
            print(f"[OpenReview] {venue_name}: {len(client_papers)} papers (client)")
            continue

        # 回退到 api2.openreview.net REST（不依赖 openreview-py，部署环境无 openreview-py 时使用）
        rest_papers = _fetch_openreview_via_rest_v2(
            venue_id, venue_name, cutoff_ms, seen_ids, venue_quota
        )
        if rest_papers:
            papers.extend(rest_papers)
            print(f"[OpenReview] {venue_name}: {len(rest_papers)} papers (REST v2)")
            continue

        # 最后回退到 api.openreview.net v1（部分旧会议有效）
        venue_count = 0
        for inv_suffix in ["Submission", "Blind_Submission"]:
            if venue_count >= max_per_venue:
                break
            invitation = f"{venue_id}/-/{inv_suffix}"
            offset = 0
            got_any = False
            while venue_count < max_per_venue and len(papers) < max_results:
                params = {
                    "invitation": invitation,
                    "limit": 100,
                    "offset": offset,
                    "sort": "cdate:desc",
                }
                try:
                    r = requests.get(
                        OPENREVIEW_API, params=params, headers=OPENREVIEW_HEADERS, timeout=60
                    )
                    r.raise_for_status()
                    data = r.json()
                except Exception:
                    break

                notes = data.get("notes", [])
                if not notes:
                    break
                got_any = True

                for note in notes:
                    note_id = note.get("id")
                    if not note_id or note_id in seen_ids:
                        continue
                    cdate = note.get("cdate") or 0
                    pdate = note.get("pdate") or cdate
                    if pdate and pdate < cutoff_ms:
                        continue
                    content = note.get("content") or {}
                    title = content.get("title") or ""
                    abstract = content.get("abstract") or ""
                    authors = content.get("authors") or []
                    authors_str = ", ".join(a for a in authors if isinstance(a, str))
                    doi = content.get("doi")
                    forum_url = f"https://openreview.net/forum?id={note_id}"
                    pdf_url = f"https://openreview.net/pdf?id={note_id}"
                    published_at = datetime.fromtimestamp(pdate / 1000, tz=timezone.utc).isoformat()

                    papers.append({
                        "id": f"openreview:{note_id}",
                        "title": title.replace("\n", " "),
                        "abstract": abstract.replace("\n", " "),
                        "authors": authors_str,
                        "categories": venue_name,
                        "pdf_url": pdf_url,
                        "arxiv_url": forum_url,
                        "published_at": published_at,
                        "source": "openreview",
                        "doi": doi,
                        "url": forum_url,
                        "affiliations": "",
                        "keywords": "",
                        "updated_at": None,
                    })
                    seen_ids.add(note_id)
                    venue_count += 1
                    if venue_count >= max_per_venue or len(papers) >= max_results:
                        break

                offset += len(notes)
                if len(notes) < 100:
                    break
            if got_any:
                break  # 该 invitation 有效，已处理完，进入下一 venue

    papers.sort(key=lambda x: x["published_at"] or "", reverse=True)
    return papers[:max_results]


def _parse_s2_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _fetch_s2_single(
    query: str,
    limit: int,
    cutoff: datetime,
) -> list[dict]:
    """Fetch papers for one S2 query. Returns list of paper dicts."""
    params = {"query": query, "limit": limit, "fields": S2_FIELDS}
    headers = {"User-Agent": "ResearchTracker/1.0"}
    try:
        r = requests.get(S2_API, params=params, headers=headers, timeout=S2_TIMEOUT)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return []
    result = []
    for item in data.get("data", []):
        paper_id = item.get("paperId")
        if not paper_id:
            continue
        pub_date = item.get("publicationDate")
        pub_dt = _parse_s2_date(pub_date)
        if pub_dt and pub_dt < cutoff:
            continue
        authors = item.get("authors") or []
        authors_str = ", ".join(a.get("name", "") for a in authors if a.get("name"))
        affiliations = []
        for a in authors:
            for aff in (a.get("affiliations") or []):
                if aff:
                    affiliations.append(aff)
        affiliations_str = ", ".join(sorted(set(affiliations)))
        external_ids = item.get("externalIds") or {}
        doi = external_ids.get("DOI")
        arxiv_id = external_ids.get("ArXiv")
        url = item.get("url") or ""
        if arxiv_id:
            url = url or f"https://arxiv.org/abs/{arxiv_id}"
        venue = ""
        publication_venue = item.get("publicationVenue") or {}
        if isinstance(publication_venue, dict):
            venue = publication_venue.get("name") or ""
        venue = venue or item.get("venue") or "Semantic Scholar"
        citation_count = item.get("citationCount")
        result.append({
            "id": f"s2:{paper_id}",
            "title": (item.get("title") or "").replace("\n", " "),
            "abstract": (item.get("abstract") or "").replace("\n", " "),
            "authors": authors_str,
            "categories": venue,
            "pdf_url": "",
            "arxiv_url": url,
            "published_at": pub_date or (f"{item.get('year')}-01-01" if item.get("year") else ""),
            "source": "s2",
            "doi": doi,
            "url": url,
            "affiliations": affiliations_str,
            "keywords": query,
            "venue": venue,
            "citation_count": citation_count,
            "updated_at": None,
        })
    return result


def fetch_semantic_scholar_papers(days: int = 15, max_results: int = 400) -> list[dict]:
    """Fetch recent papers from Semantic Scholar (public Graph API). Parallel requests with S2_WORKERS."""
    papers = []
    seen_ids = set()
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    queries = load_crawl_keywords("papers")
    if not queries:
        queries = _load_s2_queries()
    if not queries:
        queries = ARXIV_SEARCH_KEYWORDS
    if not queries:
        queries = S2_DEFAULT_QUERIES

    for i in range(0, len(queries), S2_WORKERS):
        if len(papers) >= max_results or len(papers) >= S2_EARLY_EXIT:
            break
        batch = queries[i : i + S2_WORKERS]
        limit = min(50, max_results - len(papers))
        with ThreadPoolExecutor(max_workers=S2_WORKERS) as ex:
            futures = {
                ex.submit(_fetch_s2_single, q, limit, cutoff): q
                for q in batch
            }
            for future in as_completed(futures):
                batch_papers = future.result()
                for p in batch_papers:
                    pid = p["id"]
                    if pid not in seen_ids:
                        seen_ids.add(pid)
                        papers.append(p)

    papers.sort(key=lambda x: x["published_at"] or "", reverse=True)
    return papers[:max_results]


def _load_subscriptions(cursor):
    cursor.execute("SELECT id, type, value FROM subscriptions WHERE active = 1")
    return cursor.fetchall()


def _load_s2_queries():
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT query FROM s2_queries WHERE active = 1 ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [r["query"] for r in rows if r["query"]]
    except Exception:
        return []
    finally:
        conn.close()


def _normalize_title(value: str) -> str:
    return "".join(ch.lower() for ch in value if ch.isalnum() or ch.isspace()).strip()


def _matches_subscription(paper: dict, sub) -> bool:
    sub_type = (sub["type"] or "").lower()
    value = (sub["value"] or "").strip().lower()
    if not value:
        return False

    def contains(field: str) -> bool:
        return value in (field or "").lower()

    if sub_type == "keyword":
        return (
            contains(paper.get("title", ""))
            or contains(paper.get("abstract", ""))
            or contains(paper.get("categories", ""))
        )
    if sub_type == "author":
        return contains(paper.get("authors", ""))
    if sub_type == "affiliation":
        return contains(paper.get("affiliations", ""))
    if sub_type == "category":
        return contains(paper.get("categories", ""))
    if sub_type == "source":
        return value == (paper.get("source") or "").lower()
    return False


def fetch_and_store(days: int = 15, tag: str | None = None):
    """Fetch papers and store in database. tag: 选定标签时 arXiv 按该标签关键词抓取；S2 抓取后按该标签关键词过滤入库。"""
    init_db()
    with ThreadPoolExecutor(max_workers=2) as ex:
        fut_arxiv = ex.submit(fetch_recent_papers, days=days, tag=tag)
        fut_s2 = ex.submit(fetch_semantic_scholar_papers, days)
        papers = fut_arxiv.result() + fut_s2.result()

    conn = get_connection()
    cursor = conn.cursor()
    subscriptions = _load_subscriptions(cursor)
    inserted = 0
    notifications = 0

    for p in papers:
        try:
            cursor.execute("SELECT id FROM papers WHERE id = ?", (p["id"],))
            existing = cursor.fetchone()
            is_new = existing is None
            if existing is None:
                doi = p.get("doi")
                url = p.get("url")
                title_key = _normalize_title(p.get("title", ""))
                cursor.execute("""
                    SELECT id FROM papers
                    WHERE (doi IS NOT NULL AND doi = ?)
                       OR (url IS NOT NULL AND url = ?)
                       OR (LOWER(title) = ?)
                    LIMIT 1
                """, (doi, url, title_key))
                dup = cursor.fetchone()
                if dup is not None:
                    is_new = False
                    continue
            tags_list = tag_paper(
                p.get("title", ""),
                p.get("abstract", ""),
                p.get("categories", ""),
                p.get("keywords", ""),
                p.get("source", ""),
                p.get("venue", ""),
            )
            if not any(t in BUSINESS_TAGS for t in tags_list):
                continue
            # 指定 tag 时，S2 等抓到的论文也按该研究方向关键词过滤
            tag_key = tag.strip() if tag and tag.strip() else None
            if tag_key and tag_key in PAPER_TAG_KEYWORDS and tag_key not in tags_list:
                continue
            tags = tags_to_str(tags_list)
            cursor.execute("""
                INSERT OR REPLACE INTO papers
                (id, title, abstract, authors, categories, pdf_url, arxiv_url, published_at, source, doi, url, affiliations, keywords, venue, citation_count, tags, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p["id"], p["title"], p["abstract"], p["authors"],
                p["categories"], p["pdf_url"], p["arxiv_url"],
                p["published_at"], p.get("source"), p.get("doi"),
                p.get("url"), p.get("affiliations"), p.get("keywords"),
                p.get("venue"), p.get("citation_count"), tags,
                p["updated_at"]
            ))
            inserted += 1
            if is_new and subscriptions:
                for sub in subscriptions:
                    if _matches_subscription(p, sub):
                        cursor.execute("""
                            INSERT INTO notifications (paper_id, subscription_id, reason)
                            VALUES (?, ?, ?)
                        """, (p["id"], sub["id"], f"{sub['type']}:{sub['value']}"))
                        notifications += 1
        except Exception as e:
            print(f"Error inserting {p['id']}: {e}")

    conn.commit()
    conn.close()
    return inserted, notifications


def backfill_paper_tags(force: bool = False) -> int:
    """Backfill tags for papers. If force=False, only papers with NULL/empty tags. Returns count updated."""
    conn = get_connection()
    cursor = conn.cursor()
    if force:
        cursor.execute("SELECT id, title, abstract, categories, keywords, source, venue FROM papers")
    else:
        cursor.execute(
            "SELECT id, title, abstract, categories, keywords, source, venue FROM papers WHERE tags IS NULL OR tags = ''"
        )
    rows = cursor.fetchall()
    updated = 0
    for row in rows:
        tags_list = tag_paper(
            row["title"] or "",
            row["abstract"] or "",
            row["categories"] or "",
            row["keywords"] or "",
            row["source"] or "",
            row["venue"] or "",
        )
        tags = tags_to_str(tags_list)
        cursor.execute("UPDATE papers SET tags = ? WHERE id = ?", (tags, row["id"]))
        updated += 1
    conn.commit()
    conn.close()
    return updated


def cleanup_papers_without_business_tags(openreview_only: bool = False) -> int:
    """Delete papers that have no business tags. Returns count deleted.
    openreview_only: if True, only delete OpenReview papers without research direction tags."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, tags, source FROM papers")
    rows = cursor.fetchall()
    deleted = 0
    for row in rows:
        tags_list = str_to_tags(row.get("tags") or "")
        has_business = any(t in BUSINESS_TAGS for t in tags_list)
        if not has_business:
            cursor.execute("DELETE FROM notifications WHERE paper_id = ?", (row["id"],))
            cursor.execute("DELETE FROM papers WHERE id = ?", (row["id"],))
            deleted += 1
            continue
        if openreview_only and row.get("source") == "openreview":
            has_research = any(t in PAPER_TAG_KEYWORDS for t in tags_list)
            if not has_research:
                cursor.execute("DELETE FROM notifications WHERE paper_id = ?", (row["id"],))
                cursor.execute("DELETE FROM papers WHERE id = ?", (row["id"],))
                deleted += 1
    conn.commit()
    conn.close()
    return deleted

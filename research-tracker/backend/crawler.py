"""arXiv paper crawler - uses arXiv REST API (no arxiv/feedparser, Python 3.13+ compatible)."""
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
import sqlite3
import requests

from database import get_connection, init_db, load_crawl_keywords
from tagging import tag_paper, tags_to_str, BUSINESS_TAGS

ARXIV_API = "http://export.arxiv.org/api/query"
ARXIV_NS = {"atom": "http://www.w3.org/2005/Atom"}
ARXIV_CATEGORIES = ["cs.CV", "cs.LG", "cs.GR", "cs.RO", "cs.CL", "cs.AI", "cs.MM", "eess.IV"]

OPENREVIEW_API = "https://api.openreview.net/notes"
# 仅 2025 年及以后的会议
OPENREVIEW_VENUES = [
    "CVPR 2026 Conference",
    "ICCV 2025 Conference",
    "ECCV 2026 Conference",
    "ICLR 2026 Conference",
    "NeurIPS 2026 Conference",
    "SIGGRAPH 2026 Conference",
    "CVPR 2025 Conference",
    "ICLR 2025 Conference",
    "NeurIPS 2025 Conference",
    "SIGGRAPH 2025 Conference",
]

S2_API = "https://api.semanticscholar.org/graph/v1/paper/search"
S2_FIELDS = "paperId,title,abstract,authors,publicationDate,year,venue,publicationVenue,citationCount,externalIds,url"
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
    "3D reconstruction",
    "3D generation",
    "human avatar",
    "character animation",
    "Gaussian splatting editing",
    "underwater 3D reconstruction",
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


def fetch_recent_papers(days: int = 7, max_results: int = 150) -> list[dict]:
    """Fetch recent papers from arXiv API."""
    papers = []
    seen_ids = set()
    for cat in ARXIV_CATEGORIES:
        params = {
            "search_query": f"cat:{cat}",
            "sortBy": "submittedDate",
            "sortOrder": "descending",
            "start": 0,
            "max_results": max(max_results // len(ARXIV_CATEGORIES), 15),
        }
        try:
            r = requests.get(ARXIV_API, params=params, timeout=30)
            r.raise_for_status()
            root = ET.fromstring(r.content)
        except Exception:
            continue

        for entry in root.findall("atom:entry", ARXIV_NS):
            p = _parse_entry(entry)
            if not p or p["id"] in seen_ids:
                continue
            seen_ids.add(p["id"])
            papers.append(p)

    papers.sort(key=lambda x: x["published_at"] or "", reverse=True)
    return papers[:max_results]


def fetch_openreview_papers(days: int = 7, max_results: int = 150) -> list[dict]:
    """Fetch recent papers from OpenReview API."""
    papers = []
    seen_ids = set()
    cutoff_ms = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp() * 1000)

    for venue in OPENREVIEW_VENUES:
        offset = 0
        while len(papers) < max_results:
            params = {
                "content.venue": venue,
                "limit": 100,
                "offset": offset,
                "sort": "cdate:desc",
            }
            try:
                r = requests.get(OPENREVIEW_API, params=params, timeout=30)
                r.raise_for_status()
                data = r.json()
            except Exception:
                break

            notes = data.get("notes", [])
            if not notes:
                break

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
                    "categories": venue,
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
                if len(papers) >= max_results:
                    break

            offset += len(notes)
            if len(notes) < 100:
                break

    papers.sort(key=lambda x: x["published_at"] or "", reverse=True)
    return papers[:max_results]


def fetch_semantic_scholar_papers(days: int = 7, max_results: int = 150) -> list[dict]:
    """Fetch recent papers from Semantic Scholar (public Graph API)."""
    papers = []
    seen_ids = set()
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    def _parse_date(value: str | None) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    queries = load_crawl_keywords("papers")
    if not queries:
        queries = _load_s2_queries()
    if not queries:
        queries = S2_DEFAULT_QUERIES

    for query in queries:
        if len(papers) >= max_results:
            break
        params = {
            "query": query,
            "limit": min(20, max_results - len(papers)),
            "fields": S2_FIELDS,
        }
        try:
            r = requests.get(S2_API, params=params, timeout=30)
            r.raise_for_status()
            data = r.json()
        except Exception:
            continue

        for item in data.get("data", []):
            paper_id = item.get("paperId")
            if not paper_id or paper_id in seen_ids:
                continue
            pub_date = item.get("publicationDate")
            pub_dt = _parse_date(pub_date)
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

            papers.append({
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
            seen_ids.add(paper_id)

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


def fetch_and_store(days: int = 7):
    """Fetch papers and store in database."""
    init_db()
    papers = fetch_recent_papers(days=days)
    papers += fetch_openreview_papers(days=days)
    papers += fetch_semantic_scholar_papers(days=days)

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

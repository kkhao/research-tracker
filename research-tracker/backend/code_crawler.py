"""Code crawler: GitHub, Hugging Face."""
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
import requests
from database import get_connection, init_db, load_crawl_keywords
from tagging import tag_post, tags_to_str, POST_TAG_KEYWORDS, THREEDGS_REQUIRED_TAGS, SEARCH_WITHOUT_3DGS_PREFIX
from crawler import ARXIV_SEARCH_KEYWORDS

GITHUB_API = "https://api.github.com/search/repositories"
HF_API = "https://huggingface.co/api/models"

CODE_PER_KEYWORD = min(30, max(10, int(os.getenv("CODE_PER_KEYWORD", "20"))))


def _parse_date(s: str | None) -> datetime | None:
    """Parse ISO date string to datetime for comparison."""
    if not s or not str(s).strip():
        return None
    try:
        s = str(s).strip()[:19]
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _fetch_github(query: str, max_results: int = 15, created_since: str | None = None) -> list[dict]:
    """Fetch from GitHub search (repos). created_since: YYYY-MM-DD for created:>= filter."""
    posts = []
    q = f"{query} created:>={created_since}" if created_since else query
    try:
        r = requests.get(
            GITHUB_API,
            params={"q": q, "sort": "created", "per_page": max_results},
            headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "ResearchTracker"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        for item in data.get("items", []):
            full_name = item.get("full_name") or item.get("name")
            if not full_name:
                continue
            posts.append({
                "id": f"github_{item.get('id', full_name)}",
                "source": "github",
                "title": (item.get("full_name") or item.get("name") or "").strip(),
                "url": item.get("html_url") or "",
                "author": item.get("owner", {}).get("login") or "",
                "score": item.get("stargazers_count") or 0,
                "comment_count": 0,
                "summary": (item.get("description") or "")[:500],
                "channel": "",
                "created_at": item.get("created_at"),
            })
    except Exception as e:
        print(f"GitHub fetch error: {e}")
    return posts


def _fetch_huggingface(query: str, max_results: int = 15, cutoff_dt: datetime | None = None) -> list[dict]:
    """Fetch from Hugging Face Hub (models). cutoff_dt: filter items created after this (client-side)."""
    posts = []
    limit = min(max(max_results, 50), 50) if cutoff_dt else min(max_results, 50)
    sort = "created" if cutoff_dt else "downloads"
    try:
        r = requests.get(
            HF_API,
            params={
                "search": query,
                "limit": limit,
                "sort": sort,
            },
            timeout=20,
            headers={"User-Agent": "ResearchTracker/1.0"},
        )
        r.raise_for_status()
        data = r.json()
        for item in data:
            model_id = item.get("modelId") or item.get("id")
            if not model_id:
                continue
            created = item.get("createdAt") or item.get("lastModified")
            if cutoff_dt and created:
                dt = _parse_date(created)
                if dt and dt.replace(tzinfo=None) < cutoff_dt.replace(tzinfo=None):
                    continue
            author = model_id.split("/")[0] if "/" in model_id else ""
            posts.append({
                "id": f"hf_{model_id.replace('/', '_')}",
                "source": "huggingface",
                "title": model_id,
                "url": f"https://huggingface.co/{model_id}",
                "author": author,
                "score": item.get("downloads") or item.get("likes") or 0,
                "comment_count": 0,
                "summary": "",
                "channel": ", ".join(item.get("tags", [])[:3]) if item.get("tags") else "",
                "created_at": created,
            })
    except Exception as e:
        print(f"Hugging Face fetch error: {e}")
    return posts


def _normalize_url(url: str) -> str:
    if not url or not url.strip():
        return ""
    try:
        parsed = urlparse(url.strip())
        if not parsed.netloc:
            return ""
        query_params = parse_qs(parsed.query, keep_blank_values=False)
        filtered = {k: v for k, v in query_params.items()
                    if not (k.startswith("utm_") or k in ("fbclid", "gclid", "ref"))}
        new_query = urlencode(filtered, doseq=True)
        path = parsed.path.rstrip("/") or "/"
        return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", new_query, ""))
    except Exception:
        return url


def fetch_and_store_code_posts(days: int | None = None, tag: str | None = None) -> int:
    """Fetch GitHub and Hugging Face posts and store in DB.
    days: only fetch items created in last N days (30/90). None = no filter (all).
    tag: when set, only use keywords for this tag (from POST_TAG_KEYWORDS). Enables 选定标签->选定时间 抓取.
    """
    init_db()
    all_posts = []
    seen_ids = set()
    seen_urls = set()

    created_since = None
    cutoff_dt = None
    if days and days > 0:
        cutoff = datetime.now() - timedelta(days=days)
        created_since = cutoff.strftime("%Y-%m-%d")
        cutoff_dt = cutoff

    def _add_post(p):
        if p["id"] in seen_ids:
            return
        norm_url = _normalize_url(p.get("url") or "")
        if norm_url and norm_url in seen_urls:
            return
        seen_ids.add(p["id"])
        if norm_url:
            seen_urls.add(norm_url)
        all_posts.append(p)

    # 选定标签：仅用该标签对应的关键词抓取
    if tag and tag.strip() and tag.strip() in POST_TAG_KEYWORDS:
        keywords = [k for k in POST_TAG_KEYWORDS[tag.strip()] if len(k.strip()) >= 3]
        # 3dgs 子标签：搜索时附加 3dgs 约束；空间智能不加（组合过窄易返回空，打标仍需 3dgs）
        if tag.strip() in THREEDGS_REQUIRED_TAGS and tag.strip() not in SEARCH_WITHOUT_3DGS_PREFIX and keywords:
            keywords = [f"3dgs {k}" for k in keywords]
    else:
        keywords = load_crawl_keywords("community")
        if not keywords:
            keywords = ARXIV_SEARCH_KEYWORDS
        if not keywords:
            keywords = ["3D Gaussian Splatting", "world model", "physics simulation", "3D reconstruction", "embodied AI"]

    kw_lower = [k.lower() for k in keywords]

    def _fetch_github_batch():
        out = []
        for kw in kw_lower:
            out.extend(_fetch_github(kw, max_results=CODE_PER_KEYWORD, created_since=created_since))
        return out

    def _fetch_hf_batch():
        out = []
        for kw in kw_lower:
            out.extend(_fetch_huggingface(kw, max_results=CODE_PER_KEYWORD, cutoff_dt=cutoff_dt))
        return out

    with ThreadPoolExecutor(max_workers=2) as ex:
        fut_gh = ex.submit(_fetch_github_batch)
        fut_hf = ex.submit(_fetch_hf_batch)
        for batch in [fut_gh.result(), fut_hf.result()]:
            for p in batch:
                _add_post(p)

    conn = get_connection()
    cursor = conn.cursor()
    inserted = 0
    for p in all_posts:
        try:
            tags = tags_to_str(tag_post(
                p.get("title", ""),
                p.get("summary", ""),
                p.get("source", ""),
                p.get("channel"),
            ))
            cursor.execute("""
                INSERT OR REPLACE INTO posts
                (id, source, title, url, author, score, comment_count, summary, channel, tags, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                p["id"], p["source"], p["title"], p["url"], p["author"],
                p["score"], p["comment_count"], p["summary"], p["channel"],
                tags, p["created_at"],
            ))
            inserted += 1
        except Exception as e:
            print(f"Error inserting post {p['id']}: {e}")
    conn.commit()
    conn.close()
    return inserted

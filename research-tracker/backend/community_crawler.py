"""Community crawler: Hacker News, Reddit, YouTube."""
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")
import requests
from datetime import datetime, timedelta
from database import get_connection, init_db, load_crawl_keywords
from tagging import tag_post, tags_to_str, POST_TAG_KEYWORDS, THREEDGS_REQUIRED_TAGS
from crawler import ARXIV_SEARCH_KEYWORDS

HN_API = "https://hn.algolia.com/api/v1/search"
REDDIT_BASE = "https://www.reddit.com"
YOUTUBE_API = "https://www.googleapis.com/youtube/v3/search"

REDDIT_SUBS = ["MachineLearning", "computervision", "LocalLLaMA"]
# 每个关键词抓取条数（10-20），Reddit 按子版块 limit 单独设置
COMMUNITY_PER_KEYWORD = min(20, max(10, int(os.getenv("COMMUNITY_PER_KEYWORD", "15"))))


def _get_proxies() -> dict | None:
    """Get proxies from env for requests (Reddit/YouTube 等需代理时使用)."""
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY")
    if proxy and proxy.strip():
        return {"http": proxy.strip(), "https": proxy.strip()}
    return None


def _fetch_hn(query: str, max_results: int = 20, created_after_ts: int | None = None) -> list[dict]:
    """Fetch from Hacker News via Algolia API. created_after_ts: only items created after this unix timestamp."""
    posts = []
    params = {
        "query": query,
        "tags": "story",
        "hitsPerPage": max_results,
    }
    if created_after_ts is not None:
        params["numericFilters"] = [f"created_at_i>{created_after_ts}"]
    try:
        r = requests.get(
            HN_API,
            params=params,
            timeout=20,
            headers={"User-Agent": "ResearchTracker/1.0"},
            proxies=_get_proxies(),
        )
        r.raise_for_status()
        data = r.json()
        for hit in data.get("hits", []):
            obj_id = hit.get("objectID") or hit.get("id")
            if not obj_id:
                continue
            posts.append({
                "id": f"hn_{obj_id}",
                "source": "hn",
                "title": (hit.get("title") or "").strip() or "(no title)",
                "url": hit.get("url") or f"https://news.ycombinator.com/item?id={obj_id}",
                "author": hit.get("author") or "",
                "score": hit.get("points") or 0,
                "comment_count": hit.get("num_comments") or 0,
                "summary": (hit.get("story_text") or hit.get("comment_text") or "")[:500],
                "channel": "",
                "created_at": datetime.fromtimestamp(hit.get("created_at_i", 0)).isoformat() if hit.get("created_at_i") else None,
            })
    except Exception as e:
        print(f"HN fetch error: {e}")
    return posts


def _fetch_reddit(sub: str, limit: int = 15, cutoff_ts: float | None = None, errors: list | None = None) -> list[dict]:
    """Fetch from Reddit (public JSON, no auth). cutoff_ts: only items created after this unix timestamp."""
    posts = []
    proxies = _get_proxies()
    try:
        r = requests.get(
            f"{REDDIT_BASE}/r/{sub}/new.json",
            params={"limit": limit},
            headers={"User-Agent": "ResearchTracker/1.0"},
            timeout=15,
            proxies=proxies,
        )
        r.raise_for_status()
        data = r.json()
        for child in data.get("data", {}).get("children", []):
            d = child.get("data", {})
            post_id = d.get("id")
            if not post_id:
                continue
            created = d.get("created")
            if cutoff_ts is not None and created is not None and created < cutoff_ts:
                continue
            posts.append({
                "id": f"reddit_{post_id}",
                "source": "reddit",
                "title": (d.get("title") or "").strip() or "(no title)",
                "url": d.get("url") or f"https://reddit.com{d.get('permalink', '')}",
                "author": d.get("author") or "",
                "score": d.get("score") or 0,
                "comment_count": d.get("num_comments") or 0,
                "summary": (d.get("selftext") or "")[:500],
                "channel": f"r/{sub}",
                "created_at": datetime.fromtimestamp(created).isoformat() if created else None,
            })
    except Exception as e:
        err_msg = f"Reddit r/{sub}: {e}"
        print(f"Reddit r/{sub} fetch error: {e}")
        if errors is not None:
            errors.append(err_msg)
    return posts


def _fetch_youtube(query: str, max_results: int = 15, cutoff_dt: datetime | None = None) -> list[dict]:
    """Fetch from YouTube Data API v3 (requires YOUTUBE_API_KEY env). cutoff_dt: only items published after this."""
    posts = []
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        return posts
    try:
        r = requests.get(
            YOUTUBE_API,
            proxies=_get_proxies(),
            params={
                "part": "snippet",
                "q": query,
                "type": "video",
                "maxResults": min(max_results, 50),
                "order": "date",
                "key": api_key,
            },
            timeout=20,
            headers={"User-Agent": "ResearchTracker/1.0"},
        )
        r.raise_for_status()
        data = r.json()
        for item in data.get("items", []):
            vid = item.get("id", {}).get("videoId")
            if not vid:
                continue
            snip = item.get("snippet", {})
            published = snip.get("publishedAt")
            if cutoff_dt and published:
                try:
                    pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                    if pub_dt.replace(tzinfo=None) < cutoff_dt.replace(tzinfo=None):
                        continue
                except (ValueError, TypeError):
                    pass
            posts.append({
                "id": f"youtube_{vid}",
                "source": "youtube",
                "title": (snip.get("title") or "").strip() or "(no title)",
                "url": f"https://www.youtube.com/watch?v={vid}",
                "author": snip.get("channelTitle") or "",
                "score": 0,
                "comment_count": 0,
                "summary": (snip.get("description") or "")[:500],
                "channel": snip.get("channelTitle") or "",
                "created_at": published,
            })
    except requests.RequestException as e:
        if hasattr(e, "response") and e.response is not None and e.response.status_code == 403:
            err_body = ""
            try:
                err_body = str(e.response.json().get("error", {}).get("message", ""))
            except Exception:
                pass
            print(f"YouTube 403: {err_body or 'API 未启用或配额/权限受限，请在 Google Cloud Console 启用 YouTube Data API v3 并检查配额'}")
        else:
            print(f"YouTube fetch error: {e}")
    return posts


def _normalize_url(url: str) -> str:
    """Normalize URL for deduplication: strip tracking params, fragment, trailing slash."""
    if not url or not url.strip():
        return ""
    try:
        parsed = urlparse(url.strip())
        if not parsed.netloc:
            return ""
        # Remove fragment
        # Filter out common tracking params (utm_*, fbclid, etc.)
        query_params = parse_qs(parsed.query, keep_blank_values=False)
        filtered = {k: v for k, v in query_params.items()
                    if not (k.startswith("utm_") or k in ("fbclid", "gclid", "ref"))}
        new_query = urlencode(filtered, doseq=True)
        path = parsed.path.rstrip("/") or "/"
        return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", new_query, ""))
    except Exception:
        return url


def fetch_and_store_posts(
    days: int = 7,
    tag: str | None = None,
    source: str | None = None,
) -> tuple[int, list[str]]:
    """Fetch community posts and store in DB.
    days: last N days (7/14/30).
    tag: when set (in POST_TAG_KEYWORDS), only use that tag's keywords for HN/YouTube. Reddit has no keyword search, skipped when tag is set.
    source: when set (hn/reddit/youtube), only fetch from that platform.
    Returns (inserted_count, list of error messages).
    """
    init_db()
    all_posts = []
    seen_ids = set()
    seen_urls = set()
    errors: list[str] = []

    cutoff = datetime.now() - timedelta(days=days)
    cutoff_ts = int(cutoff.timestamp())

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

    # 选定标签：仅用该标签对应的关键词（HN/YouTube）；Reddit 无关键词搜索，按标签时跳过
    if tag and tag.strip() and tag.strip() in POST_TAG_KEYWORDS:
        keywords = [k for k in POST_TAG_KEYWORDS[tag.strip()] if len(k.strip()) >= 3]
        # 3dgs 子标签：搜索时附加 3dgs 约束（AND 语义）
        if tag.strip() in THREEDGS_REQUIRED_TAGS and keywords:
            keywords = [f"3dgs {k}" for k in keywords]
    else:
        keywords = load_crawl_keywords("community")
        if not keywords:
            keywords = ARXIV_SEARCH_KEYWORDS
        if not keywords:
            keywords = ["3D Gaussian Splatting", "world model", "physics simulation", "3D reconstruction", "embodied AI"]

    src = (source or "").strip().lower() if source else ""
    fetch_hn = not src or src == "hn"
    fetch_reddit = (not src or src == "reddit") and (not tag or not tag.strip() or tag.strip() not in POST_TAG_KEYWORDS)
    fetch_youtube = not src or src == "youtube"

    def _fetch_hn_batch():
        out = []
        if fetch_hn:
            for kw in keywords:
                out.extend(_fetch_hn(kw, max_results=COMMUNITY_PER_KEYWORD, created_after_ts=cutoff_ts))
        return out

    def _fetch_reddit_batch():
        out = []
        if fetch_reddit:
            for sub in REDDIT_SUBS:
                out.extend(_fetch_reddit(sub, limit=COMMUNITY_PER_KEYWORD, cutoff_ts=cutoff_ts, errors=errors))
        return out

    def _fetch_youtube_batch():
        out = []
        if fetch_youtube:
            for kw in keywords:
                out.extend(_fetch_youtube(kw, max_results=COMMUNITY_PER_KEYWORD, cutoff_dt=cutoff))
        return out

    tasks = []
    if fetch_hn:
        tasks.append(_fetch_hn_batch)
    if fetch_reddit:
        tasks.append(_fetch_reddit_batch)
    if fetch_youtube:
        tasks.append(_fetch_youtube_batch)

    with ThreadPoolExecutor(max_workers=min(3, len(tasks) or 1)) as ex:
        futures = [ex.submit(fn) for fn in tasks]
        for fut in as_completed(futures):
            for p in fut.result():
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
    return inserted, errors

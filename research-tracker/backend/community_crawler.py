"""Community crawler: Hacker News, Reddit, GitHub, YouTube, Hugging Face."""
import os
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
import requests
from datetime import datetime, timedelta
from database import get_connection, init_db, load_crawl_keywords
from tagging import tag_post, tags_to_str

HN_API = "https://hn.algolia.com/api/v1/search"
REDDIT_BASE = "https://www.reddit.com"
GITHUB_API = "https://api.github.com/search/repositories"
YOUTUBE_API = "https://www.googleapis.com/youtube/v3/search"
HF_API = "https://huggingface.co/api/models"

# 统一抓取关键词（HN/GitHub/YouTube/HuggingFace 共用）
COMMUNITY_KEYWORDS = [
    "Gaussian Splatting",
    "3DGS",
    "4DGS",
    "world model",
    "physics simulation",
    "MPM",
    "diffusion 3D",
    "VR AR",
    "relighting",
    "inverse rendering",
    "3D reconstruction",
    "3D generation",
    "human avatar",
    "character animation",
    "Gaussian splatting editing",
]

REDDIT_SUBS = ["MachineLearning", "computervision", "LocalLLaMA"]


def _fetch_hn(query: str, max_results: int = 20) -> list[dict]:
    """Fetch from Hacker News via Algolia API."""
    posts = []
    try:
        r = requests.get(
            HN_API,
            params={
                "query": query,
                "tags": "story",
                "hitsPerPage": max_results,
            },
            timeout=20,
            headers={"User-Agent": "ResearchTracker/1.0"},
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


def _fetch_reddit(sub: str, limit: int = 15) -> list[dict]:
    """Fetch from Reddit (public JSON, no auth)."""
    posts = []
    try:
        r = requests.get(
            f"{REDDIT_BASE}/r/{sub}/new.json",
            params={"limit": limit},
            headers={"User-Agent": "ResearchTracker/1.0"},
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        for child in data.get("data", {}).get("children", []):
            d = child.get("data", {})
            post_id = d.get("id")
            if not post_id:
                continue
            created = d.get("created")
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
        print(f"Reddit r/{sub} fetch error: {e}")
    return posts


def _fetch_github(query: str, max_results: int = 15) -> list[dict]:
    """Fetch from GitHub search (repos)."""
    posts = []
    try:
        r = requests.get(
            GITHUB_API,
            params={"q": query, "sort": "created", "per_page": max_results},
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


def _fetch_youtube(query: str, max_results: int = 15) -> list[dict]:
    """Fetch from YouTube Data API v3 (requires YOUTUBE_API_KEY env)."""
    posts = []
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        return posts
    try:
        r = requests.get(
            YOUTUBE_API,
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
    except Exception as e:
        print(f"YouTube fetch error: {e}")
    return posts


def _fetch_huggingface(query: str, max_results: int = 15) -> list[dict]:
    """Fetch from Hugging Face Hub (models)."""
    posts = []
    try:
        r = requests.get(
            HF_API,
            params={
                "search": query,
                "limit": min(max_results, 50),
                "sort": "downloads",
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
            author = model_id.split("/")[0] if "/" in model_id else ""
            created = item.get("createdAt") or item.get("lastModified")
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


def fetch_and_store_posts(days: int = 7) -> int:
    """Fetch community posts and store in DB."""
    init_db()
    all_posts = []
    seen_ids = set()
    seen_urls = set()

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

    keywords = load_crawl_keywords("community")
    if not keywords:
        keywords = COMMUNITY_KEYWORDS
    # 使用关键词统一抓取
    for kw in keywords[:8]:  # HN 限制数量避免请求过多
        for p in _fetch_hn(kw, max_results=8):
            _add_post(p)

    for sub in REDDIT_SUBS:
        for p in _fetch_reddit(sub, limit=15):
            _add_post(p)

    for kw in [k.lower() for k in keywords[:10]]:
        for p in _fetch_github(kw, max_results=8):
            _add_post(p)

    for kw in keywords[:8]:
        for p in _fetch_youtube(kw, max_results=8):
            _add_post(p)

    for kw in [k.lower() for k in keywords[:10]]:
        for p in _fetch_huggingface(kw, max_results=8):
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

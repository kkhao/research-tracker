"""Company product updates crawler - Google News RSS + 微信公众号 (RSSHub)."""
import os
import re
import urllib.parse
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode
from concurrent.futures import ThreadPoolExecutor, as_completed
import html
import feedparser
import requests
from datetime import datetime, timezone, timedelta

# 每家公司抓取条数（减少请求量）
COMPANY_MAX_RESULTS = int(os.getenv("COMPANY_FETCH_MAX_RESULTS", "5"))
# 并行抓取线程数
COMPANY_FETCH_WORKERS = int(os.getenv("COMPANY_FETCH_WORKERS", "6"))


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode entities. Handles Google News RSS HTML format."""
    if not text:
        return ""
    # 先 unescape，再移除所有 HTML 标签（包括多行、属性含引号等）
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", "", text, flags=re.DOTALL)
    return re.sub(r"\s+", " ", text).strip()


from database import get_connection, init_db, load_crawl_keywords
from tagging import tag_company_post, tags_to_str

# 方向 -> 公司列表（每方向约5家）
COMPANY_DIRECTIONS = {
    "3d_gen": ["Tripo3D", "腾讯混元", "Luma AI", "Meshy", "Wonder3D"],
    "video_world": ["Marble", "极佳视界", "可灵", "Runway", "Pika"],
    "3d_design": ["群核科技", "D5 Render", "光辉城市", "NVIDIA", "Unity"],
    "llm": ["智谱AI", "阿里通义", "字节豆包", "Minimax", "百川智能"],
    "embodied": ["NVIDIA", "宇树科技", "智元机器人", "Figure", "Boston Dynamics"],
}

# 公司 -> 搜索关键词（用于 RSS）
COMPANY_QUERIES = {
    "Tripo3D": "Tripo3D AI 3D",
    "腾讯混元": "腾讯混元 3D",
    "Luma AI": "Luma AI 3D",
    "Meshy": "Meshy AI 3D",
    "Wonder3D": "Wonder3D 3D",
    "Marble": "Marble AI world model",
    "极佳视界": "极佳视界 4D",
    "可灵": "可灵 Kling 视频",
    "Runway": "Runway Gen-3",
    "Pika": "Pika Labs 视频",
    "群核科技": "群核科技 酷家乐",
    "D5 Render": "D5 Render 渲染",
    "光辉城市": "光辉城市 Mars",
    "NVIDIA": "NVIDIA Omniverse",
    "Unity": "Unity AI 3D",
    "智谱AI": "智谱AI GLM",
    "阿里通义": "阿里通义 大模型",
    "字节豆包": "字节豆包 即梦",
    "Minimax": "Minimax 海螺",
    "百川智能": "百川智能 大模型",
    "宇树科技": "宇树科技 机器人",
    "智元机器人": "智元机器人",
    "Figure": "Figure AI robot",
    "Boston Dynamics": "Boston Dynamics",
}

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"

# 微信公众号：公司 -> (biz, aid)，通过 RSSHub 获取
# 获取方式：打开公众号文章 -> 点击顶部专辑/标签 -> 从 URL 提取 __biz 和 album_id
# 示例 URL: https://mp.weixin.qq.com/mp/appmsgalbum?__biz=MzA3MDM3NjE5NQ==&album_id=1375870284640911361
WECHAT_MP_ALBUMS: dict[str, tuple[str, str]] = {
    # "阿里通义": ("MzA3MDM3NjE5NQ==", "1375870284640911361"),  # 示例，请替换为真实值
    # "智谱AI": ("biz_value", "album_id"),  # 添加更多...
}
RSSHUB_BASE = os.getenv("RSSHUB_BASE_URL", "https://rsshub.app")


def _get_requests_session():
    """Session that respects HTTP_PROXY/HTTPS_PROXY for Google News access."""
    s = requests.Session()
    s.headers.update({"User-Agent": "ResearchTracker/1.0"})
    return s


def _fetch_company_news(company: str, max_results: int = 10, cutoff_dt: datetime | None = None) -> tuple[list[dict], str | None]:
    """Fetch company news from Google News RSS. Returns (posts, error_msg). cutoff_dt: only items published after this."""
    posts = []
    query = COMPANY_QUERIES.get(company, company)
    try:
        q_enc = urllib.parse.quote(query)
        url = f"{GOOGLE_NEWS_RSS}?q={q_enc}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans"
        if not any(ord(c) > 127 for c in query):
            url = f"{GOOGLE_NEWS_RSS}?q={q_enc}&hl=en&gl=US&ceid=US:en"
        session = _get_requests_session()
        r = session.get(url, timeout=15)
        r.raise_for_status()
        feed = feedparser.parse(r.content)
        count = 0
        for i, entry in enumerate(feed.get("entries", [])):
            if count >= max_results:
                break
            published = entry.get("published_parsed")
            if cutoff_dt and published:
                try:
                    pub_dt = datetime(*published[:6], tzinfo=timezone.utc)
                    if pub_dt.replace(tzinfo=None) < cutoff_dt.replace(tzinfo=None):
                        continue
                except (TypeError, ValueError):
                    pass
            link = entry.get("link") or ""
            title = _strip_html(entry.get("title") or "") or "(no title)"
            published = entry.get("published_parsed")
            created_at = None
            if published:
                try:
                    created_at = datetime(*published[:6], tzinfo=timezone.utc).isoformat()
                except (TypeError, ValueError):
                    pass
            raw_id = entry.get("id") or link or f"{company}_{i}_{title[:20]}"
            safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(raw_id))[:60]
            posts.append({
                "id": f"company_{company}_{i}_{abs(hash(safe_id)) % 100000}",
                "source": "company",
                "title": title,
                "url": link,
                "author": _strip_html((entry.get("source") or {}).get("title", "") or ""),
                "score": 0,
                "comment_count": 0,
                "summary": _strip_html(entry.get("summary", "") or "")[:500],
                "channel": company,
                "created_at": created_at,
            })
            count += 1
        return (posts, None)
    except Exception as e:
        err = f"{company}: {e}"
        return (posts, err)


def _fetch_wechat_news(company: str, max_results: int = 5, cutoff_dt: datetime | None = None) -> list[dict]:
    """Fetch WeChat official account articles via RSSHub. cutoff_dt: only items published after this."""
    posts = []
    biz_aid = WECHAT_MP_ALBUMS.get(company)
    if not biz_aid:
        return posts
    biz, aid = biz_aid
    try:
        url = f"{RSSHUB_BASE}/wechat/mp/msgalbum/{biz}/{aid}"
        feed = feedparser.parse(url, agent="ResearchTracker/1.0")
        count = 0
        for i, entry in enumerate(feed.get("entries", [])):
            if count >= max_results:
                break
            published = entry.get("published_parsed")
            if cutoff_dt and published:
                try:
                    pub_dt = datetime(*published[:6], tzinfo=timezone.utc)
                    if pub_dt.replace(tzinfo=None) < cutoff_dt.replace(tzinfo=None):
                        continue
                except (TypeError, ValueError):
                    pass
            link = entry.get("link") or ""
            title = _strip_html(entry.get("title") or "") or "(no title)"
            published = entry.get("published_parsed")
            created_at = None
            if published:
                try:
                    created_at = datetime(*published[:6], tzinfo=timezone.utc).isoformat()
                except (TypeError, ValueError):
                    pass
            raw_id = entry.get("id") or link or f"wechat_{company}_{i}_{title[:20]}"
            safe_id = re.sub(r"[^a-zA-Z0-9_-]", "_", str(raw_id))[:60]
            posts.append({
                "id": f"company_wechat_{company}_{i}_{abs(hash(safe_id)) % 100000}",
                "source": "company",
                "title": title,
                "url": link,
                "author": "微信公众号",
                "score": 0,
                "comment_count": 0,
                "summary": _strip_html(entry.get("summary", "") or "")[:500],
                "channel": company,
                "created_at": created_at,
            })
            count += 1
    except Exception as e:
        print(f"WeChat {company} fetch error: {e}")
    return posts


def _normalize_url(url: str) -> str:
    """Normalize URL for deduplication: strip tracking params, fragment, trailing slash."""
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


def fetch_and_store_company_posts(days: int = 90) -> tuple[int, list[str]]:
    """Fetch company news and store in DB. Only items from last N days (default 90 = 3 months). Returns (inserted_count, errors)."""
    init_db()
    all_posts = []
    errors: list[str] = []
    seen_ids = set()
    seen_urls = set()
    companies = set()
    for _dir, comps in COMPANY_DIRECTIONS.items():
        companies.update(comps)

    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=days)

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

    def _fetch_one(company: str):
        posts, err = _fetch_company_news(company, max_results=COMPANY_MAX_RESULTS, cutoff_dt=cutoff_dt)
        return (company, posts, err)

    with ThreadPoolExecutor(max_workers=COMPANY_FETCH_WORKERS) as ex:
        futures = {ex.submit(_fetch_one, c): c for c in companies}
        for fut in as_completed(futures):
            company, posts, err = fut.result()
            if err:
                errors.append(err)
            for p in posts:
                _add_post(p)

    for company in companies:
        for p in _fetch_wechat_news(company, max_results=5, cutoff_dt=cutoff_dt):
            _add_post(p)

    # 自定义关键词：作为额外 Google News 搜索
    extra_kws = load_crawl_keywords("company")
    if extra_kws:
        def _fetch_kw(kw: str):
            posts, err = _fetch_company_news(kw, max_results=COMPANY_MAX_RESULTS, cutoff_dt=cutoff_dt)
            return (kw, posts, err)
        with ThreadPoolExecutor(max_workers=COMPANY_FETCH_WORKERS) as ex:
            futures = {ex.submit(_fetch_kw, kw): kw for kw in extra_kws}
            for fut in as_completed(futures):
                kw, posts, err = fut.result()
                if err:
                    errors.append(err)
                for p in posts:
                    _add_post(p)
    conn = get_connection()
    cursor = conn.cursor()
    inserted = 0
    for p in all_posts:
        try:
            tags = tags_to_str(tag_company_post(
                p.get("title", ""),
                p.get("summary", ""),
                p.get("channel", ""),
                p.get("author", ""),
                COMPANY_DIRECTIONS,
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
            errors.append(f"DB insert {p.get('id', '')}: {e}")
    conn.commit()
    conn.close()
    return (inserted, errors)

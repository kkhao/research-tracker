"""Company product updates crawler - Google News RSS + 微信公众号 (RSSHub)."""
import os
import re
import urllib.parse
import html
import feedparser
import requests
from datetime import datetime, timezone


def _strip_html(text: str) -> str:
    """Remove HTML tags and decode entities. Handles Google News RSS HTML format."""
    if not text:
        return ""
    # 先 unescape，再移除所有 HTML 标签（包括多行、属性含引号等）
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", "", text, flags=re.DOTALL)
    return re.sub(r"\s+", " ", text).strip()


from database import get_connection, init_db
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


def _resolve_google_news_url(url: str) -> str:
    """Resolve Google News redirect URL to actual article URL."""
    if not url or "news.google.com/rss/articles" not in url:
        return url
    try:
        r = requests.head(
            url,
            allow_redirects=True,
            timeout=5,
            headers={"User-Agent": "ResearchTracker/1.0"},
        )
        return r.url if r.url and "news.google.com" not in r.url else url
    except Exception:
        return url


def _fetch_company_news(company: str, max_results: int = 10) -> list[dict]:
    """Fetch company news from Google News RSS."""
    posts = []
    query = COMPANY_QUERIES.get(company, company)
    try:
        q_enc = urllib.parse.quote(query)
        url = f"{GOOGLE_NEWS_RSS}?q={q_enc}&hl=zh-CN&gl=CN&ceid=CN:zh-Hans"
        if not any(ord(c) > 127 for c in query):
            url = f"{GOOGLE_NEWS_RSS}?q={q_enc}&hl=en&gl=US&ceid=US:en"
        feed = feedparser.parse(url, agent="ResearchTracker/1.0")
        for i, entry in enumerate(feed.get("entries", [])[:max_results]):
            link = entry.get("link") or ""
            if link:
                link = _resolve_google_news_url(link)
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
    except Exception as e:
        print(f"Company {company} fetch error: {e}")
    return posts


def _fetch_wechat_news(company: str, max_results: int = 5) -> list[dict]:
    """Fetch WeChat official account articles via RSSHub."""
    posts = []
    biz_aid = WECHAT_MP_ALBUMS.get(company)
    if not biz_aid:
        return posts
    biz, aid = biz_aid
    try:
        url = f"{RSSHUB_BASE}/wechat/mp/msgalbum/{biz}/{aid}"
        feed = feedparser.parse(url, agent="ResearchTracker/1.0")
        for i, entry in enumerate(feed.get("entries", [])[:max_results]):
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
    except Exception as e:
        print(f"WeChat {company} fetch error: {e}")
    return posts


def fetch_and_store_company_posts() -> int:
    """Fetch company news and store in DB."""
    init_db()
    all_posts = []
    seen_ids = set()
    companies = set()
    for _dir, comps in COMPANY_DIRECTIONS.items():
        companies.update(comps)
    for company in companies:
        for p in _fetch_company_news(company, max_results=5):
            if p["id"] not in seen_ids:
                seen_ids.add(p["id"])
                all_posts.append(p)
        for p in _fetch_wechat_news(company, max_results=5):
            if p["id"] not in seen_ids:
                seen_ids.add(p["id"])
                all_posts.append(p)
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
            print(f"Error inserting company post {p['id']}: {e}")
    conn.commit()
    conn.close()
    return inserted

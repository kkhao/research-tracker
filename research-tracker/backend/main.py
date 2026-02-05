"""FastAPI backend for research paper tracker."""
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from database import init_db, get_connection
from crawler import fetch_and_store, backfill_paper_tags
from community_crawler import fetch_and_store_posts
from company_crawler import fetch_and_store_company_posts, COMPANY_DIRECTIONS, _strip_html as strip_html

app = FastAPI(title="Research Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()
    # Backfill tags for existing papers that have NULL/empty tags (enables tag filtering)
    n = backfill_paper_tags()
    if n > 0:
        print(f"[startup] Backfilled tags for {n} papers")


@app.get("/")
def root():
    """Root route - redirect to docs."""
    return {
        "message": "方矩研报 API",
        "docs": "/docs",
        "health": "/api/health",
    }


def _normalize_date(value: str | None) -> str | None:
    if not value:
        return None
    if len(value) == 10:
        return f"{value}T00:00:00"
    return value


@app.get("/api/papers")
def list_papers(
    category: str | None = Query(None, description="Filter by arXiv category"),
    search: str | None = Query(None, description="Search in title/abstract"),
    days: int | None = Query(30, ge=1, le=365, description="Papers from last N days"),
    limit: int = Query(50, ge=1, le=200),
    source: str | None = Query(None, description="Filter by source (arxiv/openreview/s2)"),
    author: str | None = Query(None, description="Filter by author name"),
    affiliation: str | None = Query(None, description="Filter by affiliation"),
    keyword: str | None = Query(None, description="Keyword in title/abstract/categories"),
    tag: str | None = Query(None, description="Filter by tag (3DGS, NeRF, 世界模型, etc.)"),
    from_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    min_citations: int | None = Query(None, ge=0, description="Minimum citation count"),
):
    """List papers with optional filters."""
    conn = get_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM papers WHERE 1=1"
    params = []
    
    if category:
        query += " AND categories LIKE ?"
        params.append(f"%{category}%")
    
    if search:
        query += " AND (title LIKE ? OR abstract LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])

    if keyword:
        query += " AND (title LIKE ? OR abstract LIKE ? OR categories LIKE ?)"
        params.extend([f"%{keyword}%", f"%{keyword}%", f"%{keyword}%"])

    if author:
        query += " AND authors LIKE ?"
        params.append(f"%{author}%")

    if affiliation:
        query += " AND affiliations LIKE ?"
        params.append(f"%{affiliation}%")

    if source:
        query += " AND source = ?"
        params.append(source)

    if tag and tag.strip():
        t = tag.strip()
        query += " AND (tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)"
        params.extend([t, f"{t},%", f"%,{t},%", f"%,{t}"])

    if min_citations is not None:
        query += " AND citation_count >= ?"
        params.append(min_citations)
    
    if days:
        cutoff = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        cutoff = (cutoff - timedelta(days=days)).isoformat()
        query += " AND published_at >= ?"
        params.append(cutoff)

    if from_date:
        query += " AND published_at >= ?"
        params.append(_normalize_date(from_date))

    if to_date:
        query += " AND published_at <= ?"
        params.append(_normalize_date(to_date))
    
    query += " ORDER BY published_at DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    def _tags_list(r):
        s = r.get("tags") or ""
        return [t.strip() for t in s.split(",") if t.strip()] if s else []

    return [
        {
            "id": r["id"],
            "title": r["title"],
            "abstract": r["abstract"],
            "authors": r["authors"],
            "categories": r["categories"],
            "pdf_url": r["pdf_url"],
            "arxiv_url": r["arxiv_url"],
            "published_at": r["published_at"],
            "source": r["source"],
            "doi": r["doi"],
            "url": r["url"],
            "affiliations": r["affiliations"],
            "keywords": r["keywords"],
            "venue": r["venue"],
            "citation_count": r["citation_count"],
            "tags": _tags_list(dict(r)),
        }
        for r in rows
    ]


@app.post("/api/refresh")
def refresh_papers(days: int = Query(7, ge=1, le=30)):
    """Trigger crawl to fetch new papers from arXiv."""
    count, notifications = fetch_and_store(days=days)
    return {"status": "ok", "papers_added": count, "notifications_added": notifications}


@app.post("/api/backfill-tags")
def backfill_tags(force: bool = Query(False, description="If true, re-tag all papers")):
    """Manually backfill tags. Use if tag filter returns empty."""
    n = backfill_paper_tags(force=force)
    return {"status": "ok", "papers_updated": n}


@app.get("/api/posts")
def list_posts(
    source: str | None = Query(None, description="Filter by source (hn/reddit/github/youtube/huggingface/company)"),
    search: str | None = Query(None, description="Search in title/summary"),
    domain: str | None = Query(None, description="Filter by domain keyword (3DGS, world model, etc.)"),
    company: str | None = Query(None, description="Filter by company name (for source=company)"),
    direction: str | None = Query(None, description="Filter by direction (3d_gen/video_world/3d_design/llm/embodied)"),
    tag: str | None = Query(None, description="Filter by tag (3DGS, 大模型, etc.)"),
    days: int = Query(365, ge=1, le=365, description="Filter by days (default 365=all)"),
    limit: int = Query(50, ge=1, le=200),
):
    """List community and company posts."""
    conn = get_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM posts WHERE 1=1"
    params = []
    if source:
        query += " AND source = ?"
        params.append(source)
    if company:
        query += " AND source = 'company' AND channel = ?"
        params.append(company)
    if direction and direction in COMPANY_DIRECTIONS:
        companies = COMPANY_DIRECTIONS[direction]
        placeholders = ",".join("?" * len(companies))
        query += f" AND source = 'company' AND channel IN ({placeholders})"
        params.extend(companies)
    if search:
        query += " AND (title LIKE ? OR summary LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    if domain:
        query += " AND (title LIKE ? OR summary LIKE ?)"
        params.extend([f"%{domain}%", f"%{domain}%"])
    if tag and tag.strip():
        t = tag.strip()
        query += " AND (tags = ? OR tags LIKE ? OR tags LIKE ? OR tags LIKE ?)"
        params.extend([t, f"{t},%", f"%,{t},%", f"%,{t}"])
    # 社区动态只显示 2025 年以来的
    query += " AND (created_at >= ? OR created_at IS NULL OR created_at = '')"
    params.append("2025-01-01")
    if days and days < 365:
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()[:10]
        query += " AND (created_at >= ? OR created_at IS NULL OR created_at = '')"
        params.append(cutoff)
    query += " ORDER BY created_at DESC, score DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    def _clean_post(r):
        title = strip_html(r["title"] or "") or r["title"] or ""
        summary = strip_html(r["summary"] or "") or r["summary"] or ""
        author = (r["author"] or "").strip()
        # 公司新闻：去掉 summary 中重复的来源信息
        if r["source"] == "company" and author:
            if summary.startswith(f"{author} - "):
                summary = summary[len(author) + 3 :].strip()
            # 去掉末尾的 " 来源"（Google News 格式常在 summary 末尾带来源）
            for suffix in [f"  {author}", f" {author}", author]:
                if summary.endswith(suffix):
                    summary = summary[:-len(suffix)].strip()
                    break
        tags_str = r.get("tags") or ""
        tags_list = [t.strip() for t in tags_str.split(",") if t.strip()] if tags_str else []
        return {
            "id": r["id"],
            "source": r["source"],
            "title": title,
            "url": r["url"],
            "author": author,
            "score": r["score"],
            "comment_count": r["comment_count"],
            "summary": summary,
            "channel": r["channel"],
            "tags": tags_list,
            "created_at": r["created_at"],
        }

    return [_clean_post(dict(r)) for r in rows]


@app.post("/api/refresh-posts")
def refresh_posts(days: int = Query(7, ge=1, le=30)):
    """Trigger crawl to fetch community posts."""
    count = fetch_and_store_posts(days=days)
    return {"status": "ok", "posts_added": count}


@app.post("/api/refresh-company-posts")
def refresh_company_posts():
    """Trigger crawl to fetch company product updates."""
    count, errors = fetch_and_store_company_posts()
    return {"status": "ok", "posts_added": count, "errors": errors}


@app.get("/api/tags")
def list_tags():
    """Get all unique tags from papers and posts for filter dropdown."""
    conn = get_connection()
    cursor = conn.cursor()
    tags = set()
    cursor.execute("SELECT tags FROM papers WHERE tags IS NOT NULL AND tags != ''")
    for row in cursor.fetchall():
        for t in (row["tags"] or "").split(","):
            if t.strip():
                tags.add(t.strip())
    cursor.execute("SELECT tags FROM posts WHERE tags IS NOT NULL AND tags != ''")
    for row in cursor.fetchall():
        for t in (row["tags"] or "").split(","):
            if t.strip():
                tags.add(t.strip())
    conn.close()
    return sorted(tags)


@app.get("/api/company-config")
def get_company_config():
    """Get company directions and list for frontend filters."""
    companies = sorted(set(c for comps in COMPANY_DIRECTIONS.values() for c in comps))
    return {"directions": COMPANY_DIRECTIONS, "companies": companies}


@app.get("/api/subscriptions")
def list_subscriptions():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, type, value, active, created_at FROM subscriptions ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/subscriptions")
def create_subscription(payload: dict = Body(...)):
    sub_type = (payload.get("type") or "").strip()
    value = (payload.get("value") or "").strip()
    active = 1 if payload.get("active", True) else 0
    if not sub_type or not value:
        return {"status": "error", "message": "type and value required"}
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO subscriptions (type, value, active) VALUES (?, ?, ?)",
        (sub_type, value, active),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"status": "ok", "id": new_id}


@app.patch("/api/subscriptions/{sub_id}")
def update_subscription(sub_id: int, payload: dict = Body(...)):
    active = payload.get("active")
    if active is None:
        return {"status": "error", "message": "active required"}
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE subscriptions SET active = ? WHERE id = ?", (1 if active else 0, sub_id))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.delete("/api/subscriptions/{sub_id}")
def delete_subscription(sub_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM subscriptions WHERE id = ?", (sub_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/api/s2-queries")
def list_s2_queries():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, query, active, created_at FROM s2_queries ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/s2-queries")
def create_s2_query(payload: dict = Body(...)):
    query = (payload.get("query") or "").strip()
    active = 1 if payload.get("active", True) else 0
    if not query:
        return {"status": "error", "message": "query required"}
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO s2_queries (query, active) VALUES (?, ?)",
        (query, active),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"status": "ok", "id": new_id}


@app.patch("/api/s2-queries/{query_id}")
def update_s2_query(query_id: int, payload: dict = Body(...)):
    active = payload.get("active")
    if active is None:
        return {"status": "error", "message": "active required"}
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE s2_queries SET active = ? WHERE id = ?", (1 if active else 0, query_id))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.delete("/api/s2-queries/{query_id}")
def delete_s2_query(query_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM s2_queries WHERE id = ?", (query_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/api/crawl-keywords")
def list_crawl_keywords():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, keyword, scope, active, created_at FROM crawl_keywords ORDER BY created_at DESC"
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.post("/api/crawl-keywords")
def create_crawl_keyword(payload: dict = Body(...)):
    keyword = (payload.get("keyword") or "").strip()
    scope = (payload.get("scope") or "all").strip() or "all"
    active = 1 if payload.get("active", True) else 0
    if not keyword:
        return {"status": "error", "message": "keyword required"}
    if scope not in ("papers", "community", "company", "all"):
        scope = "all"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO crawl_keywords (keyword, scope, active) VALUES (?, ?, ?)",
        (keyword, scope, active),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return {"status": "ok", "id": new_id}


@app.patch("/api/crawl-keywords/{kw_id}")
def update_crawl_keyword(kw_id: int, payload: dict = Body(...)):
    active = payload.get("active")
    if active is None:
        return {"status": "error", "message": "active required"}
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE crawl_keywords SET active = ? WHERE id = ?", (1 if active else 0, kw_id))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.delete("/api/crawl-keywords/{kw_id}")
def delete_crawl_keyword(kw_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM crawl_keywords WHERE id = ?", (kw_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/api/notifications")
def list_notifications(
    unread: bool | None = Query(None),
    limit: int = Query(20, ge=1, le=200),
):
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT n.id, n.paper_id, n.subscription_id, n.reason, n.read, n.created_at,
               p.title, p.authors, p.arxiv_url, p.published_at, p.source
        FROM notifications n
        LEFT JOIN papers p ON p.id = n.paper_id
        WHERE 1=1
    """
    params = []
    if unread is True:
        query += " AND n.read = 0"
    query += " ORDER BY n.created_at DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.patch("/api/notifications/{note_id}/read")
def mark_notification_read(note_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE notifications SET read = 1 WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/api/health")
def health():
    return {"status": "ok"}

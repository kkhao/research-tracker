"""Database cleanup by retention. Papers 1y, code 1y, community/company 3mo."""
from datetime import datetime, timedelta, timezone

from database import get_connection

PAPERS_RETENTION_DAYS = 365
POSTS_CODE_RETENTION_DAYS = 365  # github, huggingface
POSTS_COMMUNITY_RETENTION_DAYS = 90  # hn, reddit, youtube, company

CODE_SOURCES = ("github", "huggingface")
COMMUNITY_SOURCES = ("hn", "reddit", "youtube", "company")


def _cutoff_date(days: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")


def cleanup_papers_by_age(keep_days: int = PAPERS_RETENTION_DAYS) -> int:
    """Delete papers older than keep_days. Also deletes related notifications. Returns count deleted."""
    cutoff = _cutoff_date(keep_days)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id FROM papers WHERE published_at IS NOT NULL AND published_at != '' AND published_at < ?",
        (cutoff,),
    )
    ids = [r["id"] for r in cursor.fetchall()]
    deleted = 0
    for pid in ids:
        cursor.execute("DELETE FROM notifications WHERE paper_id = ?", (pid,))
        cursor.execute("DELETE FROM papers WHERE id = ?", (pid,))
        deleted += 1
    conn.commit()
    conn.close()
    return deleted


def cleanup_posts_by_age(
    code_keep_days: int = POSTS_CODE_RETENTION_DAYS,
    community_keep_days: int = POSTS_COMMUNITY_RETENTION_DAYS,
) -> tuple[int, int]:
    """Delete posts older than retention. Code (github/huggingface) 1y, community/company 3mo.
    Returns (code_deleted, community_deleted)."""
    code_cutoff = _cutoff_date(code_keep_days)
    community_cutoff = _cutoff_date(community_keep_days)
    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" * len(CODE_SOURCES))
    cursor.execute(
        f"DELETE FROM posts WHERE source IN ({placeholders}) AND created_at IS NOT NULL AND created_at != '' AND created_at < ?",
        (*CODE_SOURCES, code_cutoff),
    )
    code_deleted = cursor.rowcount
    placeholders = ",".join("?" * len(COMMUNITY_SOURCES))
    cursor.execute(
        f"DELETE FROM posts WHERE source IN ({placeholders}) AND created_at IS NOT NULL AND created_at != '' AND created_at < ?",
        (*COMMUNITY_SOURCES, community_cutoff),
    )
    community_deleted = cursor.rowcount
    conn.commit()
    conn.close()
    return (code_deleted, community_deleted)


def run_cleanup(
    papers_keep_days: int = PAPERS_RETENTION_DAYS,
    code_keep_days: int = POSTS_CODE_RETENTION_DAYS,
    community_keep_days: int = POSTS_COMMUNITY_RETENTION_DAYS,
) -> dict:
    """Run full cleanup. Returns counts."""
    papers_deleted = cleanup_papers_by_age(papers_keep_days)
    code_deleted, community_deleted = cleanup_posts_by_age(
        code_keep_days=code_keep_days, community_keep_days=community_keep_days
    )
    return {
        "papers_deleted": papers_deleted,
        "posts_code_deleted": code_deleted,
        "posts_community_deleted": community_deleted,
    }


def run_vacuum() -> None:
    """Reclaim disk space after deletes. VACUUM requires autocommit."""
    conn = get_connection()
    conn.isolation_level = None
    conn.execute("VACUUM")
    conn.isolation_level = ""
    conn.close()

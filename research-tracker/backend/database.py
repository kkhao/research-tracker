"""SQLite database setup and operations."""
import sqlite3
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "papers.db"


def _column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())


def _ensure_columns(cursor, table: str, columns: dict[str, str]) -> None:
    for name, definition in columns.items():
        if not _column_exists(cursor, table, name):
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")


def init_db():
    """Initialize database with papers table."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS papers (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            abstract TEXT,
            authors TEXT,
            categories TEXT,
            pdf_url TEXT,
            arxiv_url TEXT,
            published_at TEXT,
            source TEXT DEFAULT 'arxiv',
            doi TEXT,
            url TEXT,
            affiliations TEXT,
            keywords TEXT,
            venue TEXT,
            citation_count INTEGER,
            updated_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    _ensure_columns(cursor, "papers", {
        "source": "TEXT DEFAULT 'arxiv'",
        "doi": "TEXT",
        "url": "TEXT",
        "affiliations": "TEXT",
        "keywords": "TEXT",
        "venue": "TEXT",
        "citation_count": "INTEGER",
        "tags": "TEXT",
    })
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_papers_published 
        ON papers(published_at DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_papers_categories 
        ON papers(categories)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_papers_source 
        ON papers(source)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_papers_pub_source 
        ON papers(published_at DESC, source)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            value TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS s2_queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crawl_keywords (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            keyword TEXT NOT NULL,
            scope TEXT DEFAULT 'all',
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            paper_id TEXT NOT NULL,
            subscription_id INTEGER,
            reason TEXT,
            read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_notifications_read 
        ON notifications(read)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_notifications_created 
        ON notifications(created_at DESC)
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT,
            author TEXT,
            score INTEGER DEFAULT 0,
            comment_count INTEGER DEFAULT 0,
            summary TEXT,
            channel TEXT,
            tags TEXT,
            created_at TEXT,
            fetched_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    _ensure_columns(cursor, "posts", {"tags": "TEXT"})
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_posts_source 
        ON posts(source)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_posts_created 
        ON posts(created_at DESC)
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_posts_source_created 
        ON posts(source, created_at DESC)
    """)
    conn.commit()
    conn.close()


def get_connection():
    """Get database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def migrate_diffusion_to_multimodal_tag() -> int:
    """Replace 扩散模型 with 多模态 in papers and posts tags. Returns total rows updated."""
    from tagging import str_to_tags, tags_to_str
    conn = get_connection()
    cursor = conn.cursor()
    total = 0
    for table in ("papers", "posts"):
        cursor.execute(f"SELECT id, tags FROM {table} WHERE tags IS NOT NULL AND tags != '' AND tags LIKE '%扩散模型%'")
        rows = cursor.fetchall()
        for row in rows:
            tags = str_to_tags(row["tags"])
            if "扩散模型" not in tags:
                continue
            new_tags = [t if t != "扩散模型" else "多模态" for t in tags]
            new_tags = list(dict.fromkeys(new_tags))  # dedupe
            cursor.execute(f"UPDATE {table} SET tags = ? WHERE id = ?", (tags_to_str(new_tags), row["id"]))
            total += 1
    conn.commit()
    conn.close()
    return total


def load_crawl_keywords(scope: str) -> list[str]:
    """Load active crawl keywords for given scope. scope: papers|community|company|all."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT keyword FROM crawl_keywords WHERE active = 1 AND (scope = ? OR scope = 'all') ORDER BY created_at DESC",
        (scope,),
    )
    rows = cursor.fetchall()
    conn.close()
    return [r["keyword"].strip() for r in rows if r["keyword"] and r["keyword"].strip()]

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import get_connection
from datetime import datetime, timedelta

conn = get_connection()
cur = conn.cursor()
cutoff = (datetime.now() - timedelta(days=15)).isoformat()
cur.execute("SELECT COUNT(*) FROM papers WHERE published_at >= ?", (cutoff,))
total_15d = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM papers WHERE tags LIKE '%3DGS%' AND published_at >= ?", (cutoff,))
dgs_15d = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM papers")
total = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM papers WHERE tags LIKE '%3DGS%'")
dgs_total = cur.fetchone()[0]
conn.close()
print("DB - last 15 days: total", total_15d, "| 3DGS tag", dgs_15d)
print("DB - all time: total", total, "| 3DGS tag", dgs_total)

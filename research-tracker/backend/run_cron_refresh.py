#!/usr/bin/env python3
"""定时抓取脚本：调用 backend /api/refresh 并退出。用于 Railway Cron Job。"""
import os
import sys

import requests

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
DAYS = int(os.environ.get("CRAWL_DAYS", "15"))

def main():
    url = f"{BACKEND_URL.rstrip('/')}/api/refresh"
    try:
        r = requests.post(url, params={"days": DAYS}, timeout=600)
        data = r.json() if r.ok else {}
        print(f"POST {url}?days={DAYS} -> {r.status_code}", data)
        return 0 if r.ok else 1
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())

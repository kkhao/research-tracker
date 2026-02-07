"""Verify Reddit and YouTube community fetch."""
import os
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import requests

def test_youtube_with_cutoff():
    """Simulate actual crawl: YouTube with 7-day cutoff (same as community_crawler)."""
    print("\n=== YouTube 抓取模拟（7 天时间过滤）===")
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        print("YOUTUBE_API_KEY: 未设置")
        return
    cutoff = datetime.now() - timedelta(days=7)
    print(f"截止日期: {cutoff.strftime('%Y-%m-%d')} 之后发布的视频")
    try:
        r = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": "3D Gaussian Splatting",
                "type": "video",
                "maxResults": 15,
                "order": "date",
                "key": key,
            },
            timeout=15,
        )
        if not r.ok:
            print(f"API 错误: {r.status_code} {r.text[:150]}")
            return
        data = r.json()
        items = data.get("items", [])
        passed = 0
        for item in items:
            snip = item.get("snippet", {})
            published = snip.get("publishedAt")
            if published:
                try:
                    pub_dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                    if pub_dt.replace(tzinfo=None) >= cutoff.replace(tzinfo=None):
                        passed += 1
                        print(f"  [通过] {snip.get('title', '')[:45]}... ({published[:10]})")
                    else:
                        print(f"  [过滤] {snip.get('title', '')[:45]}... ({published[:10]}) 超过7天")
                except (ValueError, TypeError):
                    passed += 1
            else:
                passed += 1
        print(f"结果: API 返回 {len(items)} 条，7天内 {passed} 条")
        if len(items) > 0 and passed == 0:
            print(">>> 原因: 所有视频均超过 7 天，被时间过滤掉。可尝试选择「近两周」或「近一个月」")
    except Exception as e:
        print(f"错误: {type(e).__name__}: {e}")


def test_reddit():
    print("=== Reddit Test ===")
    try:
        r = requests.get(
            "https://www.reddit.com/r/MachineLearning/new.json",
            params={"limit": 3},
            headers={"User-Agent": "ResearchTracker/1.0"},
            timeout=15,
        )
        print(f"Status: {r.status_code}")
        if r.ok:
            data = r.json()
            children = data.get("data", {}).get("children", [])
            print(f"Fetched {len(children)} posts")
            for c in children[:2]:
                d = c.get("data", {})
                title = (d.get("title") or "")[:50]
                print(f"  - {title}...")
            return True
        else:
            print(f"Error: {r.text[:200]}")
            return False
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        return False


def test_youtube():
    print("\n=== YouTube Test ===")
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        print("YOUTUBE_API_KEY: NOT SET - YouTube fetch returns empty")
        return False
    print(f"YOUTUBE_API_KEY: set (len={len(key)})")
    try:
        r = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": "3DGS",
                "type": "video",
                "maxResults": 2,
                "key": key,
            },
            timeout=15,
        )
        print(f"Status: {r.status_code}")
        if r.ok:
            data = r.json()
            items = data.get("items", [])
            print(f"Fetched {len(items)} videos")
            for item in items[:2]:
                snip = item.get("snippet", {})
                title = (snip.get("title") or "")[:50]
                print(f"  - {title}...")
            return True
        else:
            err = r.json() if "application/json" in r.headers.get("content-type", "") else {}
            msg = err.get("error", {}).get("message", r.text[:150])
            print(f"Error: {msg}")
            return False
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    r_ok = test_reddit()
    y_ok = test_youtube()
    test_youtube_with_cutoff()
    print("\n=== Summary ===")
    print(f"Reddit: {'OK' if r_ok else 'FAILED'}")
    print(f"YouTube: {'OK' if y_ok else 'FAILED (check YOUTUBE_API_KEY or network)'}")

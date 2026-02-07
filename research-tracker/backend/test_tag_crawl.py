#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试每组关键词抓取论文的数量及耗时。

运行:
  py test_tag_crawl.py [days]       # 默认 days=14
  py test_tag_crawl.py 14 --quick   # 仅测试前3组（快速验证）
"""
import sys
import time
from pathlib import Path

# Windows 控制台 UTF-8 输出
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    days = int(args[0]) if args else 14
    quick = "--quick" in sys.argv

    from crawler import fetch_recent_papers
    from tagging import PAPER_TAG_KEYWORDS

    tags = list(PAPER_TAG_KEYWORDS.keys())
    if quick:
        tags = tags[:3]
        print("(quick 模式: 仅测试前3组)\n")

    print(f"=== 论文抓取测试 (days={days}) ===\n")
    print(f"{'标签':<20} {'数量':>6} {'耗时(s)':>8} {'关键词数':>8}")
    print("-" * 50)

    total_papers = 0
    total_time = 0.0

    for tag in tags:
        start = time.perf_counter()
        papers = fetch_recent_papers(days=days, max_per_tag=10, tag=tag)
        elapsed = time.perf_counter() - start
        count = len(papers)
        kw_count = len(PAPER_TAG_KEYWORDS[tag])
        total_papers += count
        total_time += elapsed
        print(f"{tag:<20} {count:>6} {elapsed:>8.2f} {kw_count:>8}", flush=True)

    print("-" * 50)
    print(f"{'合计':<20} {total_papers:>6} {total_time:>8.2f}")
    print(f"\n共 {len(tags)} 组标签，总抓取 {total_papers} 篇论文，总耗时 {total_time:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())

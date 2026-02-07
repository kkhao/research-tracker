#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""测试每组关键词抓取论文的数量及耗时。

运行:
  py test_tag_crawl.py [days]       # 默认 days=14，并行抓取
  py test_tag_crawl.py 14 --quick   # 仅测试前3组（快速验证）
"""
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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

    print(f"=== 论文抓取测试 (days={days}, 并行) ===\n")
    print(f"{'标签':<20} {'数量':>6} {'耗时(s)':>8} {'关键词数':>8}")
    print("-" * 50)

    def _fetch_one(tag):
        start = time.perf_counter()
        papers = fetch_recent_papers(days=days, max_per_tag=10, tag=tag)
        elapsed = time.perf_counter() - start
        return tag, len(papers), elapsed, len(PAPER_TAG_KEYWORDS[tag])

    total_papers = 0
    results = {}

    start_all = time.perf_counter()
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = {ex.submit(_fetch_one, t): t for t in tags}
        for future in as_completed(futures):
            tag = futures[future]
            try:
                _, count, elapsed, kw_count = future.result()
                total_papers += count
                results[tag] = (count, elapsed, kw_count)
            except Exception as e:
                results[tag] = (0, 0.0, len(PAPER_TAG_KEYWORDS[tag]))
                print(f"{tag}: 错误 {e}", flush=True)

    total_time = time.perf_counter() - start_all

    for tag in tags:
        count, elapsed, kw_count = results.get(tag, (0, 0.0, 0))
        print(f"{tag:<20} {count:>6} {elapsed:>8.2f} {kw_count:>8}", flush=True)

    print("-" * 50)
    print(f"{'合计':<20} {total_papers:>6} {total_time:>8.2f}")
    print(f"\n共 {len(tags)} 组标签，总抓取 {total_papers} 篇论文，总耗时 {total_time:.2f}s（并行）")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Benchmark crawler modules - run: py benchmark_crawlers.py"""
import time
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


def bench(name: str, fn, *args, **kwargs):
    """Run fn and return (result, elapsed_seconds)."""
    start = time.perf_counter()
    result = fn(*args, **kwargs)
    elapsed = time.perf_counter() - start
    if isinstance(result, tuple):
        count = result[0] if isinstance(result[0], int) else len(result[0])
    elif isinstance(result, list):
        count = len(result)
    else:
        count = result
    print(f"  {name}: {elapsed:.1f}s, count={count}")
    return result, elapsed


if __name__ == "__main__":
    print("=== Benchmark Crawlers ===\n")

    from crawler import fetch_recent_papers
    from community_crawler import fetch_and_store_posts
    from code_crawler import fetch_and_store_code_posts
    from company_crawler import fetch_and_store_company_posts

    total = 0.0

    print("1. 论文 arXiv (tag=3DGS, days=14)")
    _, t = bench("fetch_recent_papers", fetch_recent_papers, days=14, tag="3DGS")
    total += t

    print("\n2. 社区 (全部来源, days=7)")
    _, t = bench("fetch_and_store_posts", fetch_and_store_posts, days=7)
    total += t

    print("\n3. 代码 (days=30, tag=3DGS)")
    _, t = bench("fetch_and_store_code_posts", fetch_and_store_code_posts, days=30, tag="3DGS")
    total += t

    print("\n4. 公司 (days=90)")
    _, t = bench("fetch_and_store_company_posts", fetch_and_store_company_posts, days=90)
    total += t

    print(f"\n=== Total: {total:.1f}s ===")

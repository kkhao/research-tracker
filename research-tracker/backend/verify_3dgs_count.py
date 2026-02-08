#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Verify 3DGS tag paper fetch count."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from crawler import fetch_recent_papers, fetch_openreview_papers, fetch_semantic_scholar_papers
from tagging import tag_paper, BUSINESS_TAGS

def main():
    print("=== 1. arXiv 3DGS (15 days) ===")
    arxiv = fetch_recent_papers(days=15, tag="3DGS")
    arxiv_with_tag = [
        p for p in arxiv
        if any(t in BUSINESS_TAGS for t in tag_paper(
            p.get("title", ""), p.get("abstract", ""), p.get("categories", ""),
            p.get("keywords", ""), p.get("source", ""), p.get("venue", "")
        ))
    ]
    print(f"arXiv fetch: {len(arxiv)}, with business tag: {len(arxiv_with_tag)}")

    print("\n=== 2. OpenReview (15 days) ===")
    or_papers = fetch_openreview_papers(days=15)
    or_with_tag = [
        p for p in or_papers
        if any(t in BUSINESS_TAGS for t in tag_paper(
            p.get("title", ""), p.get("abstract", ""), p.get("categories", ""),
            p.get("keywords", ""), p.get("source", ""), p.get("venue", "")
        ))
    ]
    print(f"OpenReview fetch: {len(or_papers)}, with business tag: {len(or_with_tag)}")

    print("\n=== 3. S2 (15 days) ===")
    s2 = fetch_semantic_scholar_papers(days=15)
    s2_with_tag = [
        p for p in s2
        if any(t in BUSINESS_TAGS for t in tag_paper(
            p.get("title", ""), p.get("abstract", ""), p.get("categories", ""),
            p.get("keywords", ""), p.get("source", ""), p.get("venue", "")
        ))
    ]
    print(f"S2 fetch: {len(s2)}, with business tag: {len(s2_with_tag)}")

    all_ids = set()
    for p in arxiv_with_tag + or_with_tag + s2_with_tag:
        all_ids.add(p["id"])
    print(f"\n=== 3DGS total (dedup): {len(all_ids)} papers ===")

    # Papers with 3DGS tag specifically
    arxiv_3dgs = [p for p in arxiv if "3DGS" in tag_paper(
        p.get("title", ""), p.get("abstract", ""), p.get("categories", ""),
        p.get("keywords", ""), p.get("source", ""), p.get("venue", "")
    )]
    print(f"\n=== 3DGS tag specifically (arXiv): {len(arxiv_3dgs)} papers ===")
    return 0

if __name__ == "__main__":
    sys.exit(main())

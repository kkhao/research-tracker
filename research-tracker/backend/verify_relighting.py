#!/usr/bin/env python3
"""验证 可重光照/逆渲染 标签抓取。运行: py verify_relighting.py"""
import sys
from datetime import datetime, timedelta, timezone

def main():
    print("=== 可重光照/逆渲染 抓取验证 ===\n")

    from tagging import PAPER_TAG_KEYWORDS, tag_paper, BUSINESS_TAGS
    from crawler import _build_tag_query, _fetch_tag_papers, ARXIV_API
    import requests
    import xml.etree.ElementTree as ET

    tag = "可重光照/逆渲染"
    kws = PAPER_TAG_KEYWORDS.get(tag, [])
    print(f"关键词: {kws}\n")

    # 1. 构建查询
    valid_kws = [k for k in kws if len(k.strip()) >= 3]
    query = _build_tag_query(valid_kws)
    if not query:
        print("[FAIL] 无法构建查询")
        return 1
    print(f"arXiv 查询: {query[:80]}...\n")

    # 2. 请求 arXiv（扩大日期范围以便有结果）
    end_dt = datetime.now(timezone.utc)
    start_dt = end_dt - timedelta(days=60)
    date_range = f"submittedDate:[{start_dt:%Y%m%d%H%M}+TO+{end_dt:%Y%m%d%H%M}]"
    search_query = f"({query})+AND+{date_range}"

    try:
        r = requests.get(
            "http://export.arxiv.org/api/query",
            params={
                "search_query": search_query,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "start": 0,
                "max_results": 30,
            },
            timeout=20,
        )
        r.raise_for_status()
        root = ET.fromstring(r.content)
    except Exception as e:
        print(f"[FAIL] arXiv 请求失败: {e}")
        return 1

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall("atom:entry", ns)
    print(f"arXiv 返回: {len(entries)} 篇\n")

    if not entries:
        print("[WARN] 近 60 天无匹配论文，可能该方向近期投稿较少")
        return 0

    # 3. 解析并打标
    matched = 0
    for i, entry in enumerate(entries[:10]):
        def text(elem, t):
            e = elem.find(f"atom:{t}", ns)
            return (e.text or "").strip()

        title = text(entry, "title")
        abstract = text(entry, "summary")
        cats = ", ".join(c.get("term", "") for c in entry.findall("atom:category", ns))
        tags = tag_paper(title, abstract, cats, "", "arxiv", "")
        has_relight = tag in tags
        has_biz = any(t in BUSINESS_TAGS for t in tags)
        if has_relight:
            matched += 1

        status = "OK" if has_relight else "no-tag"
        print(f"  [{i+1}] {status} | {title[:55]}...")
        if has_relight:
            print(f"       tags={tags}")
        elif not has_biz:
            print(f"       (无业务标签，入库会被过滤)")

    print(f"\n前 10 篇中匹配「可重光照/逆渲染」: {matched} 篇")
    if matched > 0:
        print("[OK] 验证通过")
    else:
        print("[WARN] 无匹配，请检查关键词或扩大日期范围")
    return 0

if __name__ == "__main__":
    sys.exit(main())

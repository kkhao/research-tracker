#!/usr/bin/env python3
"""验证 OpenReview 会议论文抓取。运行: py verify_openreview.py"""
import sys

def main():
    print("=== OpenReview 抓取验证 ===\n")
    
    # 1. 检查 openreview-py
    try:
        import openreview
        print("[OK] openreview-py 已安装")
    except ImportError as e:
        print("[FAIL] openreview-py 未安装:", e)
        print("  解决: pip install openreview-py")
        return 1
    
    # 2. 测试各会议
    client = openreview.api.OpenReviewClient(baseurl="https://api2.openreview.net")
    venues = [
        ("ICLR.cc/2025/Conference", "ICLR 2025"),
        ("NeurIPS.cc/2025/Conference", "NeurIPS 2025"),
        ("thecvf.com/CVPR/2025/Conference", "CVPR 2025"),
        ("thecvf.com/ICCV/2025/Conference", "ICCV 2025"),
    ]
    
    for venue_id, name in venues:
        inv = f"{venue_id}/-/Submission"
        try:
            count = 0
            for _ in client.get_all_notes(invitation=inv):
                count += 1
                if count >= 3:
                    break
            status = f"OK ({count}+ 篇)" if count > 0 else "空 (0 篇)"
            print(f"  {name}: {status}")
        except Exception as e:
            print(f"  {name}: 失败 - {type(e).__name__}: {e}")
    
    # 3. 完整抓取测试
    print("\n--- 完整抓取测试 ---")
    try:
        from crawler import fetch_openreview_papers
        papers = fetch_openreview_papers(days=7, max_per_venue=5)
        print(f"抓取到 {len(papers)} 篇 OpenReview 论文")
        if papers:
            from tagging import tag_paper, BUSINESS_TAGS
            p = papers[0]
            tags = tag_paper(p.get("title",""), p.get("abstract",""), p.get("categories",""), 
                             p.get("keywords",""), p.get("source",""), p.get("venue",""))
            has_biz = any(t in BUSINESS_TAGS for t in tags)
            print(f"  示例: {p['id']} | tags={tags[:4]} | 入库={has_biz}")
    except Exception as e:
        print(f"抓取失败: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    print("\n[完成] 若 CVPR/ICCV 显示 0 篇，属正常：CVF 会议审稿期间可能不公开 API。")
    return 0

if __name__ == "__main__":
    sys.exit(main())

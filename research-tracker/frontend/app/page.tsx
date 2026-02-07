"use client";

import { useState, useEffect } from "react";
import PaperCard from "@/components/PaperCard";
import PostCard, { type Post } from "@/components/PostCard";
import Filters from "@/components/Filters";
import { useDebounce } from "@/hooks/useDebounce";

const _API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE =
  _API_URL.includes("localhost") || _API_URL.includes("127.0.0.1")
    ? _API_URL
    : "/api/proxy";
const API_DISPLAY = _API_URL;

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string;
  categories: string;
  pdf_url: string;
  arxiv_url: string;
  published_at: string;
  source?: string;
  doi?: string;
  url?: string;
  affiliations?: string;
  keywords?: string;
  venue?: string;
  citation_count?: number;
  tags?: string[];
}

interface Subscription {
  id: number;
  type: string;
  value: string;
  active: number;
  created_at: string;
}

interface NotificationItem {
  id: number;
  paper_id: string;
  subscription_id: number | null;
  reason: string | null;
  read: number;
  created_at: string;
  title?: string;
  authors?: string;
  arxiv_url?: string;
  published_at?: string;
  source?: string;
}

interface S2Query {
  id: number;
  query: string;
  active: number;
  created_at: string;
}

interface CrawlKeyword {
  id: number;
  keyword: string;
  scope: string;
  active: number;
  created_at: string;
}

export default function Home() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newSubType, setNewSubType] = useState("keyword");
  const [newSubValue, setNewSubValue] = useState("");
  const [s2Queries, setS2Queries] = useState<S2Query[]>([]);
  const [newS2Query, setNewS2Query] = useState("");
  const [crawlKeywords, setCrawlKeywords] = useState<CrawlKeyword[]>([]);
  const [newCrawlKeyword, setNewCrawlKeyword] = useState("");
  const [newCrawlScope, setNewCrawlScope] = useState<"papers" | "community" | "company" | "all">("papers");
  const [activeTab, setActiveTab] = useState<"papers" | "code" | "community" | "company">("papers");
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postFilters, setPostFilters] = useState({
    source: "",
    search: "",
    domain: "",
    tag: "",
    days: 7,
  });
  const [codeFilters, setCodeFilters] = useState({
    source: "",
    search: "",
    domain: "",
    tag: "",
    days: 365,
    sort: "created",
  });
  const [companyFilters, setCompanyFilters] = useState({
    direction: "",
    company: "",
    search: "",
    tag: "",
    days: 365,
  });
  const [filters, setFilters] = useState({
    category: "",
    search: "",
    days: 15,
    conference_days: 365,
    source: "",
    author: "",
    affiliation: "",
    keyword: "",
    tag: "",
    from_date: "",
    to_date: "",
    min_citations: "",
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const debouncedAuthor = useDebounce(filters.author, 300);
  const debouncedAffiliation = useDebounce(filters.affiliation, 300);
  const debouncedKeyword = useDebounce(filters.keyword, 300);
  const debouncedPostSearch = useDebounce(postFilters.search, 300);
  const debouncedCodeSearch = useDebounce(codeFilters.search, 300);
  const debouncedCompanySearch = useDebounce(companyFilters.search, 300);

  const fetchPapers = async (effective: typeof filters, retryCount = 0) => {
    setError(null);
    const maxRetries = 7;
    const retryDelayMs = 15000;
    const fetchTimeoutMs = 90000;
    if (retryCount > 0 && !API_BASE.includes("localhost")) {
      try {
        const hc = new AbortController();
        const ht = setTimeout(() => hc.abort(), 10000);
        await fetch(`${API_BASE}/api/health`, { signal: hc.signal });
        clearTimeout(ht);
      } catch {
        /* warm-up: health check may wake Railway; continue to papers */
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fetchTimeoutMs);
    try {
      const params = new URLSearchParams();
      if (effective.category) params.set("category", effective.category);
      if (effective.search) params.set("search", effective.search);
      if (!effective.from_date && !effective.to_date) {
        params.set("days", String(effective.days));
        params.set("conference_days", String(effective.conference_days));
      }
      if (effective.source) params.set("source", effective.source);
      if (effective.author) params.set("author", effective.author);
      if (effective.affiliation) params.set("affiliation", effective.affiliation);
      if (effective.keyword) params.set("keyword", effective.keyword);
      if (effective.tag) params.set("tag", effective.tag);
      if (effective.from_date) params.set("from_date", effective.from_date);
      if (effective.to_date) params.set("to_date", effective.to_date);
      if (effective.min_citations) params.set("min_citations", effective.min_citations);
      params.set("limit", "100");

      const res = await fetch(`${API_BASE}/api/papers?${params}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setPapers(data);
      } else {
        const url = `${API_BASE}/api/papers`;
        setError(`请求失败: ${res.status}。请检查 ${url} 是否可访问`);
      }
      setLoading(false);
    } catch (e) {
      clearTimeout(timeoutId);
      if (retryCount < maxRetries) {
        setTimeout(() => fetchPapers(effective, retryCount + 1), retryDelayMs);
        return;
      }
      const err = e instanceof Error ? e : new Error(String(e));
      const hint = err.name === "AbortError"
        ? "请求超时。请稍后刷新重试。"
        : err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")
          ? "网络错误，可能被防火墙或代理阻挡。"
          : "";
      setError(`无法连接后端 (${API_DISPLAY})。${hint}请检查 NEXT_PUBLIC_API_URL 配置并 Redeploy 前端。`);
      setPapers([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers({
      ...filters,
      search: debouncedSearch,
      author: debouncedAuthor,
      affiliation: debouncedAffiliation,
      keyword: debouncedKeyword,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.category,
    filters.days,
    filters.conference_days,
    filters.source,
    filters.tag,
    filters.from_date,
    filters.to_date,
    filters.min_citations,
    debouncedSearch,
    debouncedAuthor,
    debouncedAffiliation,
    debouncedKeyword,
  ]);

  const fetchNotifications = async () => {
    const res = await fetch(`${API_BASE}/api/notifications?unread=true&limit=20`);
    if (res.ok) {
      const data = await res.json();
      setNotifications(data);
    }
  };

  const fetchSubscriptions = async () => {
    const res = await fetch(`${API_BASE}/api/subscriptions`);
    if (res.ok) {
      const data = await res.json();
      setSubscriptions(data);
    }
  };

  const fetchS2Queries = async () => {
    const res = await fetch(`${API_BASE}/api/s2-queries`);
    if (res.ok) {
      const data = await res.json();
      setS2Queries(data);
    }
  };

  const fetchCrawlKeywords = async () => {
    const res = await fetch(`${API_BASE}/api/crawl-keywords`);
    if (res.ok) {
      const data = await res.json();
      setCrawlKeywords(data);
    }
  };

  const fetchCodePosts = async (): Promise<Post[]> => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const params = new URLSearchParams();
      if (codeFilters.source) {
        params.set("source", codeFilters.source);
      } else {
        params.append("source", "github");
        params.append("source", "huggingface");
      }
      if (debouncedCodeSearch) params.set("search", debouncedCodeSearch);
      if (codeFilters.domain) params.set("domain", codeFilters.domain);
      if (codeFilters.tag) params.set("tag", codeFilters.tag);
      params.set("days", String(codeFilters.days));
      if (codeFilters.sort === "star") params.set("sort", "star");
      params.set("limit", "200");
      const res = await fetch(`${API_BASE}/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        return data;
      }
      setPosts([]);
      setPostsError(`请求失败: ${res.status}`);
      return [];
    } catch {
      setPosts([]);
      setPostsError(`无法连接后端 (${API_BASE})`);
      return [];
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchPosts = async (): Promise<Post[]> => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const params = new URLSearchParams();
      if (postFilters.source) params.set("source", postFilters.source);
      if (debouncedPostSearch) params.set("search", debouncedPostSearch);
      if (postFilters.domain) params.set("domain", postFilters.domain);
      if (postFilters.tag) params.set("tag", postFilters.tag);
      params.set("days", String(postFilters.days));
      params.set("limit", "200");
      const res = await fetch(`${API_BASE}/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        return data;
      }
      setPosts([]);
      setPostsError(`请求失败: ${res.status}`);
      return [];
    } catch {
      setPosts([]);
      setPostsError(`无法连接后端 (${API_BASE})`);
      return [];
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchCompanyPosts = async (): Promise<Post[]> => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const params = new URLSearchParams();
      params.set("source", "company");
      if (companyFilters.direction) params.set("direction", companyFilters.direction);
      if (companyFilters.company) params.set("company", companyFilters.company);
      if (debouncedCompanySearch) params.set("search", debouncedCompanySearch);
      if (companyFilters.tag) params.set("tag", companyFilters.tag);
      params.set("days", String(companyFilters.days));
      params.set("limit", "200");
      const res = await fetch(`${API_BASE}/api/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        return data;
      }
      setPosts([]);
      setPostsError(`请求失败: ${res.status}`);
      return [];
    } catch {
      setPosts([]);
      setPostsError(`无法连接后端 (${API_BASE})`);
      return [];
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "community") fetchPosts();
    if (activeTab === "code") fetchCodePosts();
    if (activeTab === "company") fetchCompanyPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    postFilters.source,
    debouncedPostSearch,
    postFilters.domain,
    postFilters.tag,
    postFilters.days,
    codeFilters.source,
    debouncedCodeSearch,
    codeFilters.domain,
    codeFilters.tag,
    codeFilters.days,
    codeFilters.sort,
    companyFilters.direction,
    companyFilters.company,
    debouncedCompanySearch,
    companyFilters.tag,
    companyFilters.days,
  ]);

  useEffect(() => {
    fetchNotifications();
    fetchSubscriptions();
    fetchS2Queries();
    fetchCrawlKeywords();
  }, []);

  const handleRefreshCodePosts = async () => {
    setPostsRefreshing(true);
    setPostsError(null);
    try {
      const params = new URLSearchParams();
      if (codeFilters.days < 365) params.set("days", String(codeFilters.days));
      if (codeFilters.tag && !["GitHub", "Hugging Face"].includes(codeFilters.tag)) {
        params.set("tag", codeFilters.tag);
      }
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_BASE}/api/refresh-code${qs}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "ok") {
        const fetched = await fetchCodePosts();
        if (data.posts_added === 0 && fetched.length === 0) {
          setPostsError("抓取完成但未获取到内容。GitHub/Hugging Face 可能无法访问，请检查网络或代理");
        }
      } else {
        setPostsError(res.ok ? "抓取失败，请稍后重试" : `请求失败: ${res.status}`);
      }
    } catch {
      setPostsError(`无法连接后端 (${API_BASE})`);
    } finally {
      setPostsRefreshing(false);
    }
  };

  const handleRefreshPosts = async () => {
    setPostsRefreshing(true);
    setPostsError(null);
    try {
      const params = new URLSearchParams();
      params.set("days", String(postFilters.days));
      if (postFilters.tag) params.set("tag", postFilters.tag);
      if (postFilters.source) params.set("source", postFilters.source);
      const res = await fetch(`${API_BASE}/api/refresh-posts?${params}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "ok") {
        const fetched = await fetchPosts();
        if (data.posts_added === 0 && fetched.length === 0) {
          setPostsError(data.hint || "抓取完成但未获取到内容。HN/Reddit/YouTube 可能无法访问，请检查网络或代理");
        }
      } else {
        setPostsError(res.ok ? "抓取失败，请稍后重试" : `请求失败: ${res.status}`);
      }
    } catch {
      setPostsError(`无法连接后端 (${API_BASE})`);
    } finally {
      setPostsRefreshing(false);
    }
  };

  const handleRefreshCompanyPosts = async () => {
    setPostsRefreshing(true);
    setPostsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/refresh-company-posts?days=90`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "ok") {
        const fetched = await fetchCompanyPosts();
        if (data.posts_added === 0 && fetched.length === 0) {
          const errList = data.errors as string[] | undefined;
          const hint = errList?.length
            ? `抓取失败: ${errList.slice(0, 3).join("; ")}${errList.length > 3 ? "…" : ""}。Google News 在中国大陆需代理，可设置 HTTPS_PROXY 或部署到海外`
            : "抓取完成但未获取到内容。Google News 可能无法访问，请检查网络或代理，或设置 HTTPS_PROXY";
          setPostsError(hint);
        }
      } else {
        setPostsError(res.ok ? "抓取失败，请稍后重试" : `请求失败: ${res.status}`);
      }
    } catch {
      setPostsError(`无法连接后端 (${API_BASE})`);
    } finally {
      setPostsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 分钟超时（按标签分页抓取较耗时）
    try {
      const params = new URLSearchParams();
      params.set("days", String(filters.days));
      if (filters.tag) params.set("tag", filters.tag);
      const res = await fetch(`${API_BASE}/api/refresh?${params}`, {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.status === "ok") {
        await fetchPapers({
          ...filters,
          search: debouncedSearch,
          author: debouncedAuthor,
          affiliation: debouncedAffiliation,
          keyword: debouncedKeyword,
        });
        await fetchNotifications();
      } else {
        setError(res.ok ? "抓取失败，请稍后重试" : `请求失败: ${res.status}`);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error) {
        if (e.name === "AbortError") {
          setError("抓取超时（超过 10 分钟）。arXiv 可能较慢，请检查网络或稍后重试");
        } else {
          setError(`无法连接后端 (${API_BASE})`);
        }
      }
      setPapers([]);
    } finally {
      setRefreshing(false);
    }
  };

  const addSubscription = async () => {
    if (!newSubValue.trim()) return;
    const res = await fetch(`${API_BASE}/api/subscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newSubType, value: newSubValue.trim() }),
    });
    if (res.ok) {
      setNewSubValue("");
      await fetchSubscriptions();
    }
  };

  const toggleSubscription = async (sub: Subscription) => {
    const res = await fetch(`${API_BASE}/api/subscriptions/${sub.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !sub.active }),
    });
    if (res.ok) {
      await fetchSubscriptions();
    }
  };

  const deleteSubscription = async (sub: Subscription) => {
    const res = await fetch(`${API_BASE}/api/subscriptions/${sub.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchSubscriptions();
    }
  };

  const markNotificationRead = async (note: NotificationItem) => {
    const res = await fetch(`${API_BASE}/api/notifications/${note.id}/read`, {
      method: "PATCH",
    });
    if (res.ok) {
      await fetchNotifications();
    }
  };

  const addS2Query = async () => {
    if (!newS2Query.trim()) return;
    const res = await fetch(`${API_BASE}/api/s2-queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: newS2Query.trim() }),
    });
    if (res.ok) {
      setNewS2Query("");
      await fetchS2Queries();
    }
  };

  const toggleS2Query = async (q: S2Query) => {
    const res = await fetch(`${API_BASE}/api/s2-queries/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !q.active }),
    });
    if (res.ok) {
      await fetchS2Queries();
    }
  };

  const deleteS2Query = async (q: S2Query) => {
    const res = await fetch(`${API_BASE}/api/s2-queries/${q.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchS2Queries();
    }
  };

  const addCrawlKeyword = async () => {
    if (!newCrawlKeyword.trim()) return;
    const res = await fetch(`${API_BASE}/api/crawl-keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: newCrawlKeyword.trim(), scope: newCrawlScope }),
    });
    if (res.ok) {
      setNewCrawlKeyword("");
      await fetchCrawlKeywords();
    }
  };

  const toggleCrawlKeyword = async (kw: CrawlKeyword) => {
    const res = await fetch(`${API_BASE}/api/crawl-keywords/${kw.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: kw.active ? 0 : 1 }),
    });
    if (res.ok) {
      await fetchCrawlKeywords();
    }
  };

  const deleteCrawlKeyword = async (kw: CrawlKeyword) => {
    const res = await fetch(`${API_BASE}/api/crawl-keywords/${kw.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchCrawlKeywords();
    }
  };

  const scopeLabel: Record<string, string> = {
    papers: "论文",
    community: "社区",
    company: "公司",
    all: "全部",
  };

  const btnBase =
    "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50";
  const btnPrimary =
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:shadow-[0_0_20px_var(--accent-glow)] disabled:hover:shadow-none";
  const btnSecondary =
    "bg-[var(--tag-bg)] border border-[var(--border)] hover:bg-[var(--tag-bg-hover)] hover:border-[var(--accent)]/30";

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/90 sticky top-0 z-10 backdrop-blur-md shadow-[0_1px_0_var(--border)]">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">
                方矩研报
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                内部 · 前沿动态 · 研究追踪 · 三维视觉 · 世界模型 · 3DGS · 物理仿真
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className={`${btnBase} ${btnSecondary} relative`}
              >
                通知
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent)] text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowSettings((v) => !v)}
                className={`${btnBase} ${btnSecondary}`}
              >
                {showSettings ? "收起设置" : "设置"}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-5">
            <div className="flex rounded-xl border border-[var(--border)] p-1 bg-[var(--tag-bg)]">
              <button
                onClick={() => setActiveTab("papers")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "papers"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--tag-bg-hover)]"
                }`}
              >
                论文
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "code"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--tag-bg-hover)]"
                }`}
              >
                代码动态
              </button>
              <button
                onClick={() => setActiveTab("community")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "community"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--tag-bg-hover)]"
                }`}
              >
                社区动态
              </button>
              <button
                onClick={() => setActiveTab("company")}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === "company"
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--tag-bg-hover)]"
                }`}
              >
                公司动态
              </button>
            </div>
            {activeTab === "papers" && (
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <Filters filters={filters} onChange={setFilters} section="main" />
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className={`${btnBase} ${btnSecondary} shrink-0`}
                >
                  {refreshing ? "抓取中…" : "从 arXiv 更新"}
                </button>
              </div>
            )}
            {activeTab === "code" && (
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <input
                  type="search"
                  placeholder="搜索..."
                  value={codeFilters.search}
                  onChange={(e) =>
                    setCodeFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  className="min-w-[120px] max-w-[180px] px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <select
                  value={codeFilters.domain}
                  onChange={(e) =>
                    setCodeFilters((f) => ({ ...f, domain: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部领域</option>
                  <option value="3DGS">3DGS</option>
                  <option value="视频/世界模型">视频/世界模型</option>
                  <option value="3DGS物理仿真">3DGS物理仿真</option>
                  <option value="3D重建/生成/渲染">3D重建/生成/渲染</option>
                  <option value="VR/AR">VR/AR</option>
                  <option value="可重光照/逆渲染">可重光照/逆渲染</option>
                  <option value="3D人体/角色">3D人体/角色</option>
                  <option value="3DGS编辑">3DGS编辑</option>
                  <option value="3DGS水下建模">3DGS水下建模</option>
                  <option value="空间智能">空间智能</option>
                </select>
                <select
                  value={codeFilters.tag}
                  onChange={(e) =>
                    setCodeFilters((f) => ({ ...f, tag: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部标签</option>
                  <option value="3DGS">3DGS</option>
                  <option value="视频/世界模型">视频/世界模型</option>
                  <option value="3DGS物理仿真">3DGS物理仿真</option>
                  <option value="3D重建/生成/渲染">3D重建/生成/渲染</option>
                  <option value="VR/AR">VR/AR</option>
                  <option value="可重光照/逆渲染">可重光照/逆渲染</option>
                  <option value="3D人体/角色">3D人体/角色</option>
                  <option value="3DGS编辑">3DGS编辑</option>
                  <option value="3DGS水下建模">3DGS水下建模</option>
                  <option value="空间智能">空间智能</option>
                  <option value="GitHub">GitHub</option>
                  <option value="Hugging Face">Hugging Face</option>
                </select>
                <select
                  value={codeFilters.source}
                  onChange={(e) =>
                    setCodeFilters((f) => ({ ...f, source: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部来源</option>
                  <option value="github">GitHub</option>
                  <option value="huggingface">Hugging Face</option>
                </select>
                <select
                  value={codeFilters.sort}
                  onChange={(e) =>
                    setCodeFilters((f) => ({ ...f, sort: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="created">按时间</option>
                  <option value="star">按 Star</option>
                </select>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={codeFilters.days}
                    onChange={(e) =>
                      setCodeFilters((f) => ({
                        ...f,
                        days: Number(e.target.value),
                      }))
                    }
                    className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  >
                    <option value={30}>近一月</option>
                    <option value={90}>近三月</option>
                    <option value={365}>全部</option>
                  </select>
                  <button
                    onClick={handleRefreshCodePosts}
                    disabled={postsRefreshing}
                    className={`${btnBase} ${btnSecondary}`}
                  >
                    {postsRefreshing ? "抓取中…" : "刷新代码"}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "community" && (
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <input
                  type="search"
                  placeholder="搜索..."
                  value={postFilters.search}
                  onChange={(e) =>
                    setPostFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  className="min-w-[120px] max-w-[180px] px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <select
                  value={postFilters.domain}
                  onChange={(e) =>
                    setPostFilters((f) => ({ ...f, domain: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部领域</option>
                  <option value="3DGS">3DGS</option>
                  <option value="视频/世界模型">视频/世界模型</option>
                  <option value="3DGS物理仿真">3DGS物理仿真</option>
                  <option value="3D重建/生成/渲染">3D重建/生成/渲染</option>
                  <option value="VR/AR">VR/AR</option>
                  <option value="可重光照/逆渲染">可重光照/逆渲染</option>
                  <option value="3D人体/角色">3D人体/角色</option>
                  <option value="3DGS编辑">3DGS编辑</option>
                  <option value="3DGS水下建模">3DGS水下建模</option>
                  <option value="空间智能">空间智能</option>
                </select>
                <select
                  value={postFilters.tag}
                  onChange={(e) =>
                    setPostFilters((f) => ({ ...f, tag: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部标签</option>
                  <option value="3DGS">3DGS</option>
                  <option value="视频/世界模型">视频/世界模型</option>
                  <option value="3DGS物理仿真">3DGS物理仿真</option>
                  <option value="3D重建/生成/渲染">3D重建/生成/渲染</option>
                  <option value="VR/AR">VR/AR</option>
                  <option value="可重光照/逆渲染">可重光照/逆渲染</option>
                  <option value="3D人体/角色">3D人体/角色</option>
                  <option value="3DGS编辑">3DGS编辑</option>
                  <option value="3DGS水下建模">3DGS水下建模</option>
                  <option value="空间智能">空间智能</option>
                  <option value="HN">HN</option>
                  <option value="Reddit">Reddit</option>
                  <option value="YouTube">YouTube</option>
                </select>
                <select
                  value={postFilters.source}
                  onChange={(e) =>
                    setPostFilters((f) => ({ ...f, source: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部来源</option>
                  <option value="hn">Hacker News</option>
                  <option value="reddit">Reddit</option>
                  <option value="youtube">YouTube</option>
                </select>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={postFilters.days}
                    onChange={(e) =>
                      setPostFilters((f) => ({
                        ...f,
                        days: Number(e.target.value),
                      }))
                    }
                    className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  >
                    <option value={7}>近一周</option>
                    <option value={14}>近两周</option>
                    <option value={30}>近一个月</option>
                  </select>
                  <button
                    onClick={handleRefreshPosts}
                    disabled={postsRefreshing}
                    className={`${btnBase} ${btnSecondary}`}
                  >
                    {postsRefreshing ? "抓取中…" : "刷新社区"}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "company" && (
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <input
                  type="search"
                  placeholder="搜索..."
                  value={companyFilters.search}
                  onChange={(e) =>
                    setCompanyFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  className="min-w-[120px] max-w-[180px] px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
                <select
                  value={companyFilters.direction}
                  onChange={(e) =>
                    setCompanyFilters((f) => ({ ...f, direction: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部方向</option>
                  <option value="3d_gen">3D重建/生成/渲染</option>
                  <option value="video_world">视频/世界模型</option>
                  <option value="3d_design">3D设计</option>
                  <option value="llm">大模型</option>
                  <option value="embodied">机器人</option>
                </select>
                <select
                  value={companyFilters.tag}
                  onChange={(e) =>
                    setCompanyFilters((f) => ({ ...f, tag: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部标签</option>
                  <option value="微信公众号">微信公众号</option>
                  <option value="3DGS">3DGS</option>
                  <option value="视频/世界模型">视频/世界模型</option>
                  <option value="3DGS物理仿真">3DGS物理仿真</option>
                  <option value="3D重建/生成/渲染">3D重建/生成/渲染</option>
                  <option value="3D设计">3D设计</option>
                  <option value="VR/AR">VR/AR</option>
                  <option value="可重光照/逆渲染">可重光照/逆渲染</option>
                  <option value="3D人体/角色">3D人体/角色</option>
                  <option value="3DGS编辑">3DGS编辑</option>
                  <option value="3DGS水下建模">3DGS水下建模</option>
                  <option value="空间智能">空间智能</option>
                </select>
                <select
                  value={companyFilters.company}
                  onChange={(e) =>
                    setCompanyFilters((f) => ({ ...f, company: e.target.value }))
                  }
                  className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                >
                  <option value="">全部公司</option>
                  <option value="Tripo3D">Tripo3D</option>
                  <option value="腾讯混元">腾讯混元</option>
                  <option value="Luma AI">Luma AI</option>
                  <option value="Meshy">Meshy</option>
                  <option value="Wonder3D">Wonder3D</option>
                  <option value="Marble">Marble</option>
                  <option value="极佳视界">极佳视界</option>
                  <option value="可灵">可灵</option>
                  <option value="Runway">Runway</option>
                  <option value="Pika">Pika</option>
                  <option value="群核科技">群核科技</option>
                  <option value="D5 Render">D5 Render</option>
                  <option value="光辉城市">光辉城市</option>
                  <option value="NVIDIA">NVIDIA</option>
                  <option value="Unity">Unity</option>
                  <option value="智谱AI">智谱AI</option>
                  <option value="阿里通义">阿里通义</option>
                  <option value="字节豆包">字节豆包</option>
                  <option value="Minimax">Minimax</option>
                  <option value="百川智能">百川智能</option>
                  <option value="宇树科技">宇树科技</option>
                  <option value="智元机器人">智元机器人</option>
                  <option value="Figure">Figure</option>
                  <option value="Boston Dynamics">Boston Dynamics</option>
                </select>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={companyFilters.days}
                    onChange={(e) =>
                      setCompanyFilters((f) => ({
                        ...f,
                        days: Number(e.target.value),
                      }))
                    }
                    className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  >
                    <option value={30}>近30天</option>
                    <option value={90}>近90天</option>
                    <option value={365}>全部</option>
                  </select>
                  <button
                    onClick={handleRefreshCompanyPosts}
                    disabled={postsRefreshing}
                    className={`${btnBase} ${btnSecondary}`}
                  >
                    {postsRefreshing ? "抓取中…" : "刷新公司"}
                  </button>
                </div>
              </div>
            )}
          </div>
          {showNotifications && (
            <div className="mt-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--card-shadow)]">
              <div className="text-sm font-medium text-[var(--text-muted)] mb-3">
                最新通知
              </div>
              {notifications.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">暂无通知</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{n.title || n.paper_id}</div>
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          {n.reason}
                        </div>
                      </div>
                      <button
                        onClick={() => markNotificationRead(n)}
                        className="shrink-0 px-2 py-1 rounded text-xs border border-[var(--border)] hover:bg-[var(--border)]"
                      >
                        已读
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {showSettings && (
            <div className="mt-4 space-y-5 p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--card-shadow)]">
              <div>
                <div className="text-sm font-medium text-[var(--text-muted)] mb-3">
                  数据维护
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_BASE}/api/backfill-tags?force=true`, {
                        method: "POST",
                      });
                      const data = await res.json();
                      if (res.ok) {
                        alert(`已补全 ${data.papers_updated} 篇论文的标签`);
                        fetchPapers({
                          ...filters,
                          search: debouncedSearch,
                          author: debouncedAuthor,
                          affiliation: debouncedAffiliation,
                          keyword: debouncedKeyword,
                        });
                      }
                    } catch (e) {
                      alert("补全失败");
                    }
                  }}
                  className={`${btnBase} ${btnSecondary}`}
                >
                  补全论文标签
                </button>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  若标签筛选无结果，可点击此按钮为已有论文补全标签
                </p>
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-muted)] mb-3">
                  高级筛选
                </div>
                <Filters filters={filters} onChange={setFilters} section="advanced" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-muted)] mb-3">
                  订阅
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <select
                    value={newSubType}
                    onChange={(e) => setNewSubType(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  >
                    <option value="keyword">关键词</option>
                    <option value="author">作者</option>
                    <option value="affiliation">机构</option>
                    <option value="category">分类</option>
                    <option value="source">来源</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Fei-Fei Li / NVIDIA / 3DGS"
                    value={newSubValue}
                    onChange={(e) => setNewSubValue(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  />
                  <button
                    onClick={addSubscription}
                    className={`${btnBase} ${btnSecondary}`}
                  >
                    添加
                  </button>
                </div>
                {subscriptions.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)]">暂无订阅</div>
                ) : (
                  <div className="space-y-2">
                    {subscriptions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 text-sm py-1.5"
                      >
                        <div className="truncate">
                          <span className="text-[var(--text-muted)]">{s.type}</span>
                          <span className="mx-1">·</span>
                          {s.value}
                          {!s.active && (
                            <span className="ml-1 text-xs text-[var(--text-muted)]">(已暂停)</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleSubscription(s)}
                            className="px-2 py-0.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--border)]"
                          >
                            {s.active ? "暂停" : "恢复"}
                          </button>
                          <button
                            onClick={() => deleteSubscription(s)}
                            className="px-2 py-0.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--border)]"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-muted)] mb-3">
                  Semantic Scholar 查询词
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="3D Gaussian Splatting"
                    value={newS2Query}
                    onChange={(e) => setNewS2Query(e.target.value)}
                    className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  />
                  <button
                    onClick={addS2Query}
                    className={`${btnBase} ${btnSecondary}`}
                  >
                    添加
                  </button>
                </div>
                {s2Queries.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)]">暂无查询词</div>
                ) : (
                  <div className="space-y-2">
                    {s2Queries.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center justify-between gap-3 text-sm py-1.5"
                      >
                        <div className="truncate">
                          {q.query}
                          {!q.active && (
                            <span className="ml-1 text-xs text-[var(--text-muted)]">(已暂停)</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleS2Query(q)}
                            className="px-2 py-0.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--border)]"
                          >
                            {q.active ? "暂停" : "恢复"}
                          </button>
                          <button
                            onClick={() => deleteS2Query(q)}
                            className="px-2 py-0.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--border)]"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-muted)] mb-3">
                  抓取关键词（自定义）
                </div>
                <p className="text-xs text-[var(--text-faint)] mb-2">
                  用于论文(S2)、社区(HN/Reddit/YouTube)、代码(GitHub/Hugging Face)、公司(Google News)抓取。scope=all 时对所有类型生效。
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="3D Gaussian Splatting"
                    value={newCrawlKeyword}
                    onChange={(e) => setNewCrawlKeyword(e.target.value)}
                    className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  />
                  <select
                    value={newCrawlScope}
                    onChange={(e) =>
                      setNewCrawlScope(e.target.value as "papers" | "community" | "company" | "all")
                    }
                    className="px-3 py-1.5 rounded-lg bg-[var(--tag-bg)] border border-[var(--border)] text-sm"
                  >
                    <option value="papers">论文</option>
                    <option value="community">社区</option>
                    <option value="company">公司</option>
                    <option value="all">全部</option>
                  </select>
                  <button
                    onClick={addCrawlKeyword}
                    className={`${btnBase} ${btnSecondary}`}
                  >
                    添加
                  </button>
                </div>
                {crawlKeywords.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)]">暂无自定义关键词，将使用内置默认</div>
                ) : (
                  <div className="space-y-2">
                    {crawlKeywords.map((kw) => (
                      <div
                        key={kw.id}
                        className="flex items-center justify-between gap-3 text-sm py-1.5"
                      >
                        <div className="truncate min-w-0">
                          <span>{kw.keyword}</span>
                          <span className="ml-1.5 text-xs text-[var(--text-muted)]">
                            [{scopeLabel[kw.scope] ?? kw.scope}]
                          </span>
                          {!kw.active && (
                            <span className="ml-1 text-xs text-[var(--text-muted)]">(已暂停)</span>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => toggleCrawlKeyword(kw)}
                            className="px-2 py-0.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--border)]"
                          >
                            {kw.active ? "暂停" : "恢复"}
                          </button>
                          <button
                            onClick={() => deleteCrawlKeyword(kw)}
                            className="px-2 py-0.5 rounded text-xs border border-[var(--border)] hover:bg-[var(--border)]"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === "papers" && (
          <>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                <div className="text-sm text-[var(--text-muted)]">加载中…</div>
              </div>
            ) : error ? (
              <div className="text-center py-24 text-[var(--text-muted)] max-w-md mx-auto">
                <p className="mb-4 text-red-400">{error}</p>
                <p className="text-sm mb-4 text-left">
                  {API_DISPLAY.includes("localhost") ? (
                    <>本地开发请先启动后端: <code className="bg-[var(--tag-bg)] px-2 py-1 rounded text-xs">uvicorn main:app --reload --port 8000</code></>
                  ) : (
                    <>
                      Railway 部署：前端 Variables 中 <code className="bg-[var(--tag-bg)] px-2 py-1 rounded text-xs">NEXT_PUBLIC_API_URL</code> 必须填<strong>后端</strong>域名（不是前端域名）。修改后需 Redeploy 才能生效。
                    </>
                  )}
                </p>
                <a href={API_BASE.startsWith("/") ? `${API_BASE}/api/health` : `${API_DISPLAY}/api/health`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] hover:underline block mb-4">
                  测试后端健康检查 →
                </a>
                <button
                  onClick={() => {
                    setLoading(true);
                    fetchPapers({
                      ...filters,
                      search: debouncedSearch,
                      author: debouncedAuthor,
                      affiliation: debouncedAffiliation,
                      keyword: debouncedKeyword,
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)]"
                >
                  重试
                </button>
              </div>
            ) : papers.length === 0 ? (
              <div className="text-center py-24 px-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)]">
                <p className="text-[var(--text-muted)] mb-2 font-medium">暂无论文数据</p>
                <p className="text-sm text-[var(--text-faint)]">
                  点击「从 arXiv 更新」获取论文，或调整筛选条件
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-[var(--text-muted)]">
                  共 {papers.length} 篇
                </p>
                {papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
            )}
          </>
        )}
        {(activeTab === "code" || activeTab === "community" || activeTab === "company") && (
          <>
            {postsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                <div className="text-sm text-[var(--text-muted)]">加载中…</div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-24 px-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)]">
                <p className="text-[var(--text-muted)] mb-2 font-medium">
                  {activeTab === "company"
                    ? "暂无公司动态"
                    : activeTab === "code"
                      ? "暂无代码动态"
                      : "暂无社区动态"}
                </p>
                {postsError ? (
                  <p className="text-sm text-[var(--error)] mb-4">{postsError}</p>
                ) : (
                  <p className="text-sm mb-4">
                    {activeTab === "company"
                      ? "点击「刷新公司」从 Google News 抓取公司产品动态"
                      : activeTab === "code"
                        ? "点击「刷新代码」从 GitHub / Hugging Face 抓取"
                        : "点击「刷新社区」从 HN / Reddit / YouTube 抓取"}
                  </p>
                )}
                <button
                  onClick={
                    activeTab === "company"
                      ? handleRefreshCompanyPosts
                      : activeTab === "code"
                        ? handleRefreshCodePosts
                        : handleRefreshPosts
                  }
                  disabled={postsRefreshing}
                  className={`${btnBase} ${btnPrimary} mt-4`}
                >
                  {postsRefreshing
                    ? "抓取中…"
                    : activeTab === "company"
                      ? "刷新公司"
                      : activeTab === "code"
                        ? "刷新代码"
                        : "刷新社区"}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm text-[var(--text-muted)]">
                  共 {posts.length} 条
                </p>
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

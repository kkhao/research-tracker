"use client";

interface FiltersProps {
  filters: {
    category: string;
    search: string;
    days: number;
    source: string;
    author: string;
    affiliation: string;
    keyword: string;
    tag: string;
    from_date: string;
    to_date: string;
    min_citations: string;
  };
  onChange: (f: FiltersProps["filters"]) => void;
  section?: "main" | "advanced";
}

const CATEGORIES = [
  { value: "", label: "全部分类" },
  { value: "cs.CV", label: "3D视觉与重建" },
  { value: "cs.GR", label: "图形学与渲染" },
  { value: "cs.RO", label: "机器人与具身" },
];

// 与 backend/tagging.py PAPER_TAG_KEYWORDS 对齐
const RESEARCH_DOMAINS = [
  { value: "", label: "全部领域" },
  { value: "3DGS", label: "3DGS" },
  { value: "4DGS", label: "4DGS" },
  { value: "NeRF", label: "NeRF" },
  { value: "世界模型", label: "世界模型" },
  { value: "视频生成", label: "视频生成" },
  { value: "物理仿真", label: "物理仿真" },
  { value: "具身智能", label: "具身智能" },
  { value: "大模型", label: "大模型" },
  { value: "多模态", label: "多模态" },
  { value: "扩散模型", label: "扩散模型" },
  { value: "3D重建", label: "3D重建" },
  { value: "3D生成", label: "3D生成" },
  { value: "实时渲染", label: "实时渲染" },
  { value: "场景理解", label: "场景理解" },
  { value: "VR/AR", label: "VR/AR" },
  { value: "可重光照", label: "可重光照" },
  { value: "逆渲染", label: "逆渲染" },
  { value: "人体/角色", label: "人体/角色" },
  { value: "3DGS编辑", label: "3DGS编辑" },
  { value: "水下建模", label: "水下建模" },
];

// 与 backend/tagging.py PAPER_TAG_KEYWORDS 对齐
const TAG_OPTIONS = [
  { value: "", label: "全部标签" },
  { value: "3DGS", label: "3DGS" },
  { value: "4DGS", label: "4DGS" },
  { value: "NeRF", label: "NeRF" },
  { value: "世界模型", label: "世界模型" },
  { value: "视频生成", label: "视频生成" },
  { value: "物理仿真", label: "物理仿真" },
  { value: "具身智能", label: "具身智能" },
  { value: "大模型", label: "大模型" },
  { value: "多模态", label: "多模态" },
  { value: "扩散模型", label: "扩散模型" },
  { value: "3D重建", label: "3D重建" },
  { value: "3D生成", label: "3D生成" },
  { value: "3D设计", label: "3D设计" },
  { value: "实时渲染", label: "实时渲染" },
  { value: "场景理解", label: "场景理解" },
  { value: "VR/AR", label: "VR/AR" },
  { value: "可重光照", label: "可重光照" },
  { value: "逆渲染", label: "逆渲染" },
  { value: "人体/角色", label: "人体/角色" },
  { value: "3DGS编辑", label: "3DGS编辑" },
  { value: "水下建模", label: "水下建模" },
  { value: "CVPR", label: "CVPR" },
  { value: "ICCV", label: "ICCV" },
  { value: "ECCV", label: "ECCV" },
  { value: "ICLR", label: "ICLR" },
  { value: "NeurIPS", label: "NeurIPS" },
  { value: "SIGGRAPH", label: "SIGGRAPH" },
];

const DAY_OPTIONS = [
  { value: 7, label: "近7天" },
  { value: 14, label: "近14天" },
  { value: 30, label: "近30天" },
  { value: 90, label: "近90天" },
];

const inputClass =
  "px-3 py-2 rounded-xl bg-[var(--tag-bg)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-muted)] focus:border-[var(--accent)]/50 placeholder-[var(--text-faint)] transition-colors";

export default function Filters({ filters, onChange, section = "main" }: FiltersProps) {
  if (section === "main") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="搜索标题或摘要..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className={`min-w-[140px] max-w-[200px] ${inputClass}`}
        />
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className={inputClass}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={RESEARCH_DOMAINS.some((d) => d.value === filters.keyword) ? filters.keyword : ""}
          onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          className={inputClass}
        >
          {RESEARCH_DOMAINS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <select
          value={filters.tag}
          onChange={(e) => onChange({ ...filters, tag: e.target.value })}
          className={inputClass}
        >
          {TAG_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)] w-14">来源</label>
        <select
          value={filters.source}
          onChange={(e) => onChange({ ...filters, source: e.target.value })}
          className={inputClass}
        >
          <option value="">全部</option>
          <option value="arxiv">arXiv</option>
          <option value="openreview">OpenReview</option>
          <option value="s2">Semantic Scholar</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)] w-14">时间</label>
        <select
          value={filters.days}
          onChange={(e) => onChange({ ...filters, days: Number(e.target.value) })}
          className={inputClass}
        >
          {DAY_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)] w-14">起始</label>
        <input
          type="date"
          value={filters.from_date}
          onChange={(e) => onChange({ ...filters, from_date: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)] w-14">结束</label>
        <input
          type="date"
          value={filters.to_date}
          onChange={(e) => onChange({ ...filters, to_date: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)] w-14">作者</label>
        <input
          type="search"
          placeholder="Fei-Fei Li"
          value={filters.author}
          onChange={(e) => onChange({ ...filters, author: e.target.value })}
          className={`min-w-[140px] ${inputClass}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)] w-14">机构</label>
        <input
          type="search"
          placeholder="NVIDIA"
          value={filters.affiliation}
          onChange={(e) => onChange({ ...filters, affiliation: e.target.value })}
          className={`min-w-[120px] ${inputClass}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)] w-14">关键词</label>
        <input
          type="search"
          placeholder="自定义关键词"
          value={filters.keyword}
          onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
          className={`min-w-[140px] ${inputClass}`}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-[var(--text-muted)]">最少引用</label>
        <input
          type="number"
          min="0"
          placeholder="0"
          value={filters.min_citations}
          onChange={(e) => onChange({ ...filters, min_citations: e.target.value })}
          className={`w-20 ${inputClass}`}
        />
      </div>
    </div>
  );
}

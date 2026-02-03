import type { Paper } from "@/app/page";

const TAG_CLASSES: Record<string, string> = {
  "3DGS": "tag-3dgs",
  "NeRF": "tag-nerf",
  "世界模型": "tag-world",
  "视频生成": "tag-video",
  "物理仿真": "tag-physics",
  "具身智能": "tag-embodied",
  "大模型": "tag-llm",
  "3D生成": "tag-3dgen",
  "3D设计": "tag-3ddesign",
};

function getTagClass(tag: string): string {
  return TAG_CLASSES[tag] ?? "tag-default";
}

export default function PaperCard({ paper }: { paper: Paper }) {
  const date = paper.published_at ? paper.published_at.slice(0, 10) : "";
  const sourceLabel = paper.source ? paper.source.toUpperCase() : "ARXIV";
  const tags = paper.tags && paper.tags.length > 0
    ? paper.tags
    : paper.categories ? paper.categories.split(/[\s,]+/).filter(Boolean) : [];

  return (
    <article className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--card-shadow)] transition-all duration-200 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold leading-snug">
          <a
            href={paper.arxiv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text)] hover:text-[var(--accent)] transition-colors"
          >
            {paper.title}
          </a>
        </h2>
        <p className="text-sm text-[var(--text-muted)] line-clamp-3 leading-relaxed">
          {paper.abstract}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-[var(--accent-muted)] text-[var(--accent)] font-medium border border-[var(--accent)]/20">
            {sourceLabel}
          </span>
          <span className="text-[var(--text-muted)]">{paper.authors}</span>
          <span className="text-[var(--border)]">·</span>
          <span className="text-[var(--text-muted)]">{date}</span>
        </div>
        {(paper.affiliations || paper.venue || paper.citation_count !== undefined) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            {paper.venue && <span>{paper.venue}</span>}
            {paper.venue && (paper.affiliations || paper.citation_count !== undefined) && (
              <span className="text-[var(--border)]">·</span>
            )}
            {paper.affiliations && <span>{paper.affiliations}</span>}
            {paper.affiliations && paper.citation_count !== undefined && paper.citation_count !== null && (
              <span className="text-[var(--border)]">·</span>
            )}
            {paper.citation_count !== undefined && paper.citation_count !== null && (
              <span>引用 {paper.citation_count}</span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 6).map((t) => (
            <span
              key={t}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getTagClass(t)}`}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="flex gap-4 pt-1">
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
          >
            PDF
          </a>
          <a
            href={paper.arxiv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors"
          >
            arXiv
          </a>
        </div>
      </div>
    </article>
  );
}

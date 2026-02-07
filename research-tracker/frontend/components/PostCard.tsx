export interface Post {
  id: string;
  source: string;
  title: string;
  url: string;
  author: string;
  score: number;
  comment_count: number;
  summary?: string;
  channel?: string;
  tags?: string[];
  created_at?: string;
}

/** 移除 HTML 标签和常见实体，防止 Google News 等来源的 HTML 被渲染 */
function stripHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SOURCE_LABELS: Record<string, string> = {
  hn: "HN",
  reddit: "Reddit",
  github: "GitHub",
  youtube: "YouTube",
  huggingface: "Hugging Face",
  company: "公司",
};

const TAG_CLASSES: Record<string, string> = {
  "微信公众号": "tag-wechat",
  "3DGS": "tag-3dgs",
  "视频/世界模型": "tag-video-world",
  "3DGS物理仿真": "tag-physics",
  "3D重建/生成/渲染": "tag-3dgen",
  "VR/AR": "tag-vr",
  "3D设计": "tag-3ddesign",
  "可重光照/逆渲染": "tag-relight",
  "3D人体/角色": "tag-human",
  "3DGS编辑": "tag-3dgs-edit",
  "3DGS水下建模": "tag-underwater",
  "空间智能": "tag-spatial",
  "大模型": "tag-default",
  "机器人": "tag-default",
};

function getTagClass(tag: string): string {
  return TAG_CLASSES[tag] ?? "tag-default";
}

export default function PostCard({ post }: { post: Post }) {
  const date = post.created_at ? post.created_at.slice(0, 10) : "";
  const sourceLabel = SOURCE_LABELS[post.source] || post.source;
  const title = stripHtml(post.title);
  const summary = post.summary ? stripHtml(post.summary) : "";

  return (
    <article className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--card-shadow)] transition-all duration-200 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-card-hover)] hover:shadow-[var(--card-shadow-hover)] hover:-translate-y-0.5">
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold leading-snug">
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text)] hover:text-[var(--accent)] transition-colors"
          >
            {title}
          </a>
        </h2>
        {summary && (
          <p className="text-sm text-[var(--text-muted)] line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {post.source !== "company" && (
            <span className="px-2 py-0.5 rounded bg-[var(--tag-bg)] border border-[var(--border)]">
              {post.source === "github" && post.score > 0
                ? `${sourceLabel} ★${post.score >= 1000 ? (post.score / 1000).toFixed(1) + "k" : post.score}`
                : sourceLabel}
            </span>
          )}
          {post.channel && (
            <span className={`px-2 py-0.5 rounded ${post.source === "company" ? "bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30" : "bg-[var(--tag-bg)] border border-[var(--border)] text-[var(--text-muted)]"}`}>
              {post.channel}
            </span>
          )}
          {post.source === "company" && !post.channel && (
            <span className="px-2 py-0.5 rounded bg-[var(--tag-bg)] border border-[var(--border)]">
              {sourceLabel}
            </span>
          )}
          {post.author && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="text-[var(--text-muted)]">{post.author}</span>
            </>
          )}
          {post.source !== "company" && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="text-[var(--text-muted)]">
                ↑{post.score}
                {post.comment_count > 0 && ` · ${post.comment_count} 评论`}
              </span>
            </>
          )}
          {date && (
            <>
              <span className="text-[var(--border)]">·</span>
              <span className="text-[var(--text-muted)]">{date}</span>
            </>
          )}
        </div>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 6).map((t) => (
              <span
                key={t}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${getTagClass(t)}`}
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium self-start transition-colors"
        >
          查看 →
        </a>
      </div>
    </article>
  );
}

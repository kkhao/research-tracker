"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import wishes from "@/data/wishes.json";

type WishItem = {
  id: string;
  icon: string;
  title: string;
  description?: string;
  by?: string;
};

const ICON_OPTIONS = [
  "✨",
  "🎂",
  "🎁",
  "💖",
  "🌸",
  "🌈",
  "🏖️",
  "🎬",
  "📸",
  "🎵",
  "🧸",
  "🚗",
];
const BY_OPTIONS = ["郝小羊", "郝小宝", "郝小妈"] as const;

function normalizeWish(raw: unknown): WishItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" ? item.id : "";
  const icon = typeof item.icon === "string" ? item.icon : "✨";
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const description =
    typeof item.description === "string" ? item.description.trim() : "";
  const by = typeof item.by === "string" ? item.by.trim() : "";
  if (!id || !title) return null;
  return {
    id,
    icon: icon || "✨",
    title,
    description: description || undefined,
    by: by || undefined,
  };
}

export default function Wishboard() {
  const [customWishes, setCustomWishes] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [customIcon, setCustomIcon] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [by, setBy] = useState<(typeof BY_OPTIONS)[number]>(BY_OPTIONS[0]);

  const fetchWishes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wishes");
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      const cleaned = (Array.isArray(data) ? data : [])
        .map(normalizeWish)
        .filter((item): item is WishItem => Boolean(item));
      setCustomWishes(cleaned);
    } catch (e) {
      setError("无法加载愿望列表，请稍后重试");
      setCustomWishes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  const allWishes = useMemo(
    () => [...customWishes, ...(wishes as WishItem[])],
    [customWishes]
  );

  const handleAddWish = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle || submitting) return;
    const finalIcon = customIcon.trim() || selectedIcon;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/wishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icon: finalIcon || "✨",
          title: finalTitle,
          description: description.trim() || undefined,
          by,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "添加失败");
      }
      const newWish = await res.json();
      const parsed = normalizeWish(newWish);
      if (parsed) setCustomWishes((prev) => [parsed, ...prev]);
      setTitle("");
      setDescription("");
      setCustomIcon("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "添加失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWish = async (id: string) => {
    if (!id.startsWith("custom-")) return;
    const ok = window.confirm("确定删除这条愿望吗？");
    if (!ok) return;
    try {
      const res = await fetch(`/api/wishes/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");
      setCustomWishes((prev) => prev.filter((w) => w.id !== id));
    } catch {
      setError("删除失败，请重试");
    }
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAddWish}
        className="rounded-2xl bg-white/95 border-2 border-rose-200/60 p-5 shadow-lg space-y-3"
      >
        <h3 className="text-rose-800 font-semibold">写下新的愿望</h3>
        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}
        <div className="space-y-2">
          <label className="block text-sm text-rose-700">图标（默认可选，也可自定义）</label>
          <div className="flex gap-2">
            <select
              value={selectedIcon}
              onChange={(e) => setSelectedIcon(e.target.value)}
              className="w-24 rounded-xl border border-rose-200 px-2 py-2 text-base text-center text-xl bg-white outline-none focus:border-rose-400"
              aria-label="默认愿望图标"
            >
              {ICON_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <input
              value={customIcon}
              onChange={(e) => setCustomIcon(e.target.value)}
              maxLength={4}
              className="w-28 rounded-xl border border-rose-200 px-3 py-2 text-base text-center text-xl bg-white outline-none focus:border-rose-400"
              placeholder="自定义"
              aria-label="自定义愿望图标"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-rose-700">愿望标题（必填）</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            required
            className="w-full rounded-xl border border-rose-200 px-3 py-2 text-base bg-white outline-none focus:border-rose-400"
            placeholder="写下你的小愿望"
            aria-label="愿望标题"
          />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={80}
          className="w-full rounded-xl border border-rose-200 px-3 py-2 text-base bg-white outline-none focus:border-rose-400"
          placeholder="补充一句描述（可选）"
          aria-label="愿望描述"
        />
        <div className="flex items-center gap-3">
          <select
            value={by}
            onChange={(e) => setBy(e.target.value as (typeof BY_OPTIONS)[number])}
            className="rounded-xl border border-rose-200 px-3 py-2 text-base bg-white outline-none focus:border-rose-400"
            aria-label="署名"
          >
            {BY_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto rounded-xl bg-rose-400 hover:bg-rose-500 disabled:opacity-60 text-white px-4 py-2 font-medium transition-colors"
          >
            {submitting ? "提交中…" : "+ 许愿"}
          </button>
        </div>
        <p className="text-xs text-rose-500">
          愿望会保存在服务器，家人打开同一链接都能看到并一起维护。
        </p>
      </form>

      {loading ? (
        <p className="text-rose-600 text-center py-6">加载愿望列表中…</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {allWishes.map((wish) => (
            <li
              key={wish.id}
              className="relative rounded-2xl bg-white/95 border-2 border-rose-200/60 p-5 shadow-lg hover:border-rose-300 hover:shadow-xl transition-all"
            >
              {wish.id.startsWith("custom-") && (
                <button
                  type="button"
                  onClick={() => handleDeleteWish(wish.id)}
                  className="absolute right-3 top-3 rounded-lg border border-rose-200 bg-white/95 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-colors"
                  aria-label="删除这条愿望"
                >
                  删除
                </button>
              )}
              <div className="text-3xl mb-2">{wish.icon}</div>
              <h3 className="font-semibold text-rose-800 text-lg">{wish.title}</h3>
              {wish.description && (
                <p className="text-rose-600 text-sm mt-1">{wish.description}</p>
              )}
              {wish.by && (
                <p className="text-rose-500 text-xs mt-2">— {wish.by}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

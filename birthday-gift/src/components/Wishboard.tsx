"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import wishes from "@/data/wishes.json";

type WishItem = {
  id: string;
  icon: string;
  title: string;
  description?: string;
  by?: string;
};

const STORAGE_KEY = "birthday-gift-custom-wishes-v1";
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
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
  const [customIcon, setCustomIcon] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [by, setBy] = useState<(typeof BY_OPTIONS)[number]>(BY_OPTIONS[0]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHasLoadedStorage(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((item) => normalizeWish(item))
          .filter((item): item is WishItem => Boolean(item));
        setCustomWishes(cleaned);
      }
    } catch {
      // Ignore invalid localStorage content.
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customWishes));
  }, [customWishes, hasLoadedStorage]);

  const allWishes = useMemo(
    () => [...customWishes, ...(wishes as WishItem[])],
    [customWishes]
  );

  const handleAddWish = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalTitle = title.trim();
    if (!finalTitle) return;
    const finalIcon = customIcon.trim() || selectedIcon;
    const newWish: WishItem = {
      id: `custom-${Date.now()}`,
      icon: finalIcon || "✨",
      title: finalTitle,
      description: description.trim() || undefined,
      by,
    };
    setCustomWishes((prev) => [newWish, ...prev]);
    setTitle("");
    setDescription("");
    setCustomIcon("");
  };

  const handleDeleteWish = (id: string) => {
    const ok = window.confirm("确定删除这条愿望吗？");
    if (!ok) return;
    setCustomWishes((prev) => prev.filter((wish) => wish.id !== id));
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleAddWish}
        className="rounded-2xl bg-white/95 border-2 border-rose-200/60 p-5 shadow-lg space-y-3"
      >
        <h3 className="text-rose-800 font-semibold">写下新的愿望</h3>
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
            className="ml-auto rounded-xl bg-rose-400 hover:bg-rose-500 text-white px-4 py-2 font-medium transition-colors"
          >
            + 许愿
          </button>
        </div>
        <p className="text-xs text-rose-500">
          可先选默认图标，也可填写自定义图标；愿望会保存在当前设备，刷新后依然可见。
        </p>
      </form>

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
    </div>
  );
}

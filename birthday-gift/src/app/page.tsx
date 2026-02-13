"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const HomePageContent = dynamic(() => import("@/components/HomePageContent"), {
  ssr: false,
  loading: () => (
    <div className="relative z-10 max-w-2xl mx-auto text-center py-12 px-4">
      <h1 className="text-3xl md:text-4xl font-bold text-rose-800 mb-2">
        大宝，生日快乐 🎉
      </h1>
      <p className="text-rose-600 mb-8">我和宝宝永远爱你</p>
      <p className="text-rose-500 text-sm mb-8">页面加载中…</p>
      <nav className="flex flex-wrap justify-center gap-4">
        <Link
          href="/timeline"
          className="px-6 py-3 rounded-2xl bg-white/90 border-2 border-rose-200 text-rose-700 font-medium hover:bg-rose-50 shadow"
        >
          进入我们的时光
        </Link>
        <Link
          href="/wishes"
          className="px-6 py-3 rounded-2xl bg-white/90 border-2 border-rose-200 text-rose-700 font-medium hover:bg-rose-50 shadow"
        >
          写下我们的愿望
        </Link>
      </nav>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="relative min-h-screen py-12 px-4">
      <HomePageContent />
    </main>
  );
}

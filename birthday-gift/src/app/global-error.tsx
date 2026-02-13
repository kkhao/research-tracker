"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-rose-100/80 to-pink-100/80 text-rose-800">
        <p className="text-lg font-medium mb-2">页面出错了</p>
        <p className="text-sm text-rose-600 mb-4">请点击下方按钮重试</p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-rose-200 text-rose-800 font-medium hover:bg-rose-300"
        >
          重试
        </button>
      </body>
    </html>
  );
}

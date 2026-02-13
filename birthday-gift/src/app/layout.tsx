import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "送给最爱的你 — 生日快乐",
  description: "我们的时光 · 爱 · 庆典",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gradient-to-b from-rose-100/80 to-pink-100/80 min-h-screen">
        {children}
      </body>
    </html>
  );
}

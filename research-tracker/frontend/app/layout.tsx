import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "方矩研报 | 内部 · 前沿动态 · 研究追踪",
  description: "方矩星辰内部使用，追踪三维视觉、世界模型、3DGS、物理仿真等前沿研究进展",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

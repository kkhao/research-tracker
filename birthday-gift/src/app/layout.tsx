import type { Metadata } from "next";
import "./globals.css";
import { getSiteConfig } from "@/data/siteConfig";

export async function generateMetadata(): Promise<Metadata> {
  const { pageTitle, pageDescription } = getSiteConfig();
  return { title: pageTitle, description: pageDescription };
}

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

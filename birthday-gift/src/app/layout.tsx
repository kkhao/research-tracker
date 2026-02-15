import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteConfig } from "@/data/siteConfig";
import { LayoutWithMusic } from "@/contexts/MusicContext";

export async function generateMetadata(): Promise<Metadata> {
  const { pageTitle, pageDescription } = getSiteConfig();
  return { title: pageTitle, description: pageDescription };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gradient-to-b from-rose-100/80 to-pink-100/80 min-h-screen">
        <LayoutWithMusic>{children}</LayoutWithMusic>
      </body>
    </html>
  );
}

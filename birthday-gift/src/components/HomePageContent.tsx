"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import ErrorBoundary from "@/components/ErrorBoundary";
import BirthdayCake from "@/components/BirthdayCake";
import BlessingCarousel from "@/components/BlessingCarousel";
import FamilySceneFallback from "@/components/FamilySceneFallback";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { useMusic } from "@/contexts/MusicContext";

const ParticleBackground = dynamic(() => import("@/components/ParticleBackground"), { ssr: false });
const FireworksCanvas = dynamic(() => import("@/components/FireworksCanvas"), { ssr: false });
const ShootingStars = dynamic(() => import("@/components/ShootingStars"), { ssr: false });

const FamilyScene = dynamic(
  () =>
    import("@/components/FamilyScene").catch(() => ({
      default: FamilySceneFallback,
    })),
  { ssr: false, loading: () => <div className="flex items-center justify-center min-h-[280px] text-rose-400">加载中…</div> }
);

export default function HomePageContent() {
  const config = useSiteConfig();
  const { pause } = useMusic();

  return (
    <ErrorBoundary>
      <ParticleBackground />
      <FireworksCanvas />
      <ShootingStars />

      <div className="relative z-10 max-w-2xl mx-auto text-center bg-transparent">
        <div className="mb-6 md:mb-8 min-h-[280px] md:min-h-[360px]">
          <FamilyScene />
        </div>

        {config.showCake && (
          <BirthdayCake onBlowStart={pause} />
        )}
        <BlessingCarousel />

        {config.showNav && (
          <nav className="mt-12 flex flex-wrap justify-center gap-4">
            <Link
              href="/timeline"
              className="px-6 py-3 rounded-2xl bg-white/90 border-2 border-rose-200 text-rose-700 font-medium hover:bg-rose-50 hover:border-rose-300 transition-colors shadow"
            >
              进入我们的时光
            </Link>
            <Link
              href="/wishes"
              className="px-6 py-3 rounded-2xl bg-white/90 border-2 border-rose-200 text-rose-700 font-medium hover:bg-rose-50 hover:border-rose-300 transition-colors shadow"
            >
              写下我们的愿望
            </Link>
          </nav>
        )}
      </div>
    </ErrorBoundary>
  );
}

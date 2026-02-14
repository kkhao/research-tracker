import HomePageContent from "@/components/HomePageContent";
import { SiteConfigProvider } from "@/contexts/SiteConfigContext";
import { getSiteConfig } from "@/data/siteConfig";

export default function HomePage() {
  const config = getSiteConfig();
  return (
    <main className="relative min-h-screen py-12 px-4">
      <SiteConfigProvider initialConfig={config}>
        <HomePageContent />
      </SiteConfigProvider>
    </main>
  );
}

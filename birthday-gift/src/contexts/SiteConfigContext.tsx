"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteConfig } from "@/data/siteConfig";

const SiteConfigContext = createContext<SiteConfig | null>(null);

export function SiteConfigProvider({
  initialConfig,
  children,
}: {
  initialConfig: SiteConfig;
  children: ReactNode;
}) {
  return (
    <SiteConfigContext.Provider value={initialConfig}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfig {
  const config = useContext(SiteConfigContext);
  if (!config) {
    throw new Error("useSiteConfig must be used within SiteConfigProvider");
  }
  return config;
}

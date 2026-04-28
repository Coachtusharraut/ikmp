import { createContext, useContext, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: string;
  site_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  meta_description: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  spice_color: string;
  background_color: string;
  foreground_color: string;
  accent_color: string;
  font_display: string;
  font_body: string;
};

const DEFAULTS: SiteSettings = {
  id: "",
  site_name: "@coachtusharraut",
  tagline: "Indian Kitchen Meal Plan",
  hero_title: "Eat well. Lose weight. Feel vibrant.",
  hero_subtitle:
    "Curated Indian recipes, weekly meal plans and smart grocery lists by Coach Tushar Raut.",
  meta_description:
    "Lose weight & achieve holistic health with curated Indian recipes, weekly meal plans and smart grocery lists by Coach Tushar Raut.",
  logo_url: null,
  favicon_url: null,
  primary_color: "oklch(0.22 0.02 50)",
  spice_color: "oklch(0.62 0.17 40)",
  background_color: "oklch(0.985 0.005 80)",
  foreground_color: "oklch(0.18 0.015 50)",
  accent_color: "oklch(0.93 0.04 65)",
  font_display: "Fraunces",
  font_body: "Inter",
};

const SiteSettingsCtx = createContext<SiteSettings>(DEFAULTS);

export function useSiteSettings() {
  return useContext(SiteSettingsCtx);
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ["site_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as SiteSettings) ?? DEFAULTS;
    },
    staleTime: 30_000,
  });

  const settings = useMemo<SiteSettings>(() => ({ ...DEFAULTS, ...(data ?? {}) }), [data]);

  // Apply theme tokens + favicon + title
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--primary", settings.primary_color);
    root.style.setProperty("--spice", settings.spice_color);
    root.style.setProperty("--background", settings.background_color);
    root.style.setProperty("--foreground", settings.foreground_color);
    root.style.setProperty("--accent", settings.accent_color);
    root.style.setProperty("--ring", settings.spice_color);

    document.title = `${settings.site_name} — ${settings.tagline}`;

    if (settings.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings]);

  return <SiteSettingsCtx.Provider value={settings}>{children}</SiteSettingsCtx.Provider>;
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RecipeCard } from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, PlayCircle } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { ProtectedVideo } from "@/components/ProtectedVideo";

export const Route = createFileRoute("/")({
  component: Home,
});

type SectionRow = { id: string; name: string; sort_order: number };
type RecipeSectionLink = { recipe_id: string; section_id: string };

function Home() {
  const { user } = useAuth();
  const settings = useSiteSettings();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Recipe[];
    },
    enabled: !!user,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as SectionRow[];
    },
    enabled: !!user,
  });

  const { data: links = [] } = useQuery({
    queryKey: ["recipe_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_sections")
        .select("recipe_id,section_id");
      if (error) throw error;
      return data as RecipeSectionLink[];
    },
    enabled: !!user,
  });

  const sectionsByRecipe = useMemo(() => {
    const map = new Map<string, Set<string>>();
    links.forEach((l) => {
      if (!map.has(l.recipe_id)) map.set(l.recipe_id, new Set());
      map.get(l.recipe_id)!.add(l.section_id);
    });
    return map;
  }, [links]);

  const categories = useMemo(() => ["All", ...sections.map((s) => s.name)], [sections]);

  const filtered = useMemo(() => {
    const targetSection = sections.find((s) => s.name === cat);
    return recipes.filter((r) => {
      const okCat =
        cat === "All" ||
        (targetSection && sectionsByRecipe.get(r.id)?.has(targetSection.id)) ||
        // legacy fallback for recipes still using the old single category text
        r.category === cat;
      const okQ =
        !q ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.description?.toLowerCase().includes(q.toLowerCase());
      return okCat && okQ;
    });
  }, [recipes, sections, sectionsByRecipe, q, cat]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-warm)" }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 size-96 rounded-full blur-3xl opacity-40 -z-10"
          style={{ background: "var(--gradient-spice)" }}
        />
        <div className="container mx-auto px-4 pt-16 md:pt-24 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-5 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur border border-border/60">
              <Sparkles className="size-3" /> {settings.site_name} · {settings.tagline}
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-light leading-[1.02] tracking-[-0.03em]">
              {settings.hero_title}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              {settings.hero_subtitle}
            </p>
            {!user && (
              <div className="mt-8 flex gap-3">
                <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-7 h-12 text-sm tracking-wide shadow-[var(--shadow-elegant)]">
                  <Link to="/login">Start your week →</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Intro video — visible to everyone */}
      {settings.intro_video_url && (
        <section className="container mx-auto px-4 pt-4 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-3 px-3 py-1.5 rounded-full bg-card border border-border/60">
                <PlayCircle className="size-3" /> Watch first
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight">
                {settings.intro_title}
              </h2>
              {settings.intro_subtitle && (
                <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                  {settings.intro_subtitle}
                </p>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)] border border-border/60">
              <ProtectedVideo
                url={settings.intro_video_url}
                type={settings.intro_video_type}
                title={settings.intro_title}
              />
            </div>
            {!user && (
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">Ready to start? It only takes a minute.</p>
                <Button
                  asChild
                  size="lg"
                  className="bg-spice text-spice-foreground hover:bg-spice/90 rounded-full px-10 h-12 text-sm tracking-wide shadow-[var(--shadow-elegant)]"
                >
                  <Link to="/login">Sign in to get started →</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Library */}
      <section className="container mx-auto px-4 pb-20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h2 className="font-display text-2xl font-semibold">Recipe library</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search recipes…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-medium transition border " +
                (cat === c
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {c}
            </button>
          ))}
        </div>

        {!user ? (
          <div className="rounded-2xl border bg-card p-10 text-center">
            <p className="text-muted-foreground">
              <Link to="/login" className="text-spice underline underline-offset-4">
                Sign in
              </Link>{" "}
              to browse recipes and start planning your week.
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-muted-foreground">Loading recipes…</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground">No recipes found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

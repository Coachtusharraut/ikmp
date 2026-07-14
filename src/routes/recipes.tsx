import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RecipeCard } from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/recipes")({
  head: () => ({
    meta: [
      { title: "Recipe library — Coach Tushar Raut" },
      {
        name: "description",
        content:
          "Browse curated Indian recipes designed for weight loss and holistic health.",
      },
      { property: "og:title", content: "Recipe library — Coach Tushar Raut" },
      {
        property: "og:description",
        content:
          "Browse curated Indian recipes designed for weight loss and holistic health.",
      },
    ],
  }),
  component: RecipesPage,
});

type SectionRow = { id: string; name: string; sort_order: number };
type RecipeSectionLink = { recipe_id: string; section_id: string };

function RecipesPage() {
  const { user } = useAuth();
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
        r.category === cat;
      const okQ =
        !q ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.description?.toLowerCase().includes(q.toLowerCase());
      return okCat && okQ;
    });
  }, [recipes, sections, sectionsByRecipe, q, cat]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-2">
            Recipe library
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-light tracking-tight">
            Cook something delicious
          </h1>
        </div>
        <div className="relative w-full md:w-80">
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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}

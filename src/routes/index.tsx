import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RecipeCard } from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
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
    enabled: !!user, // only load when authenticated (RLS requires auth)
  });

  const categories = useMemo(() => {
    const s = new Set<string>();
    recipes.forEach((r) => s.add(r.category));
    return ["All", ...Array.from(s)];
  }, [recipes]);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const okCat = cat === "All" || r.category === cat;
      const okQ =
        !q ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.description?.toLowerCase().includes(q.toLowerCase());
      return okCat && okQ;
    });
  }, [recipes, q, cat]);

  return (
    <div>
      {/* Hero */}
      <section className="container mx-auto px-4 pt-12 pb-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-spice mb-4">
            <Sparkles className="size-3.5" /> Curated Indian recipes
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
            Plan your week.
            <br />
            <span className="text-spice italic">Eat homemade.</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl">
            Browse hand-picked Indian dishes, build your weekly meal plan, and get a
            smart grocery list — auto-scaled to your servings.
          </p>
          {!user && (
            <div className="mt-7 flex gap-3">
              <Button asChild size="lg" className="bg-spice text-spice-foreground hover:bg-spice/90">
                <Link to="/login">Get started</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

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

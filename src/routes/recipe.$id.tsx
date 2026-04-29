import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, Users, Plus, Minus, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Recipe } from "@/lib/types";
import { startOfWeekISO } from "@/lib/types";
import { ProtectedVideo } from "@/components/ProtectedVideo";

export const Route = createFileRoute("/recipe/$id")({
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = useParams({ from: "/recipe/$id" });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [servings, setServings] = useState<number | null>(null);

  const { data: recipe, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Recipe;
    },
    enabled: !!user,
  });

  const currentServings = servings ?? recipe?.default_servings ?? 4;
  const scale = recipe ? currentServings / recipe.default_servings : 1;

  const addToWeek = useMutation({
    mutationFn: async () => {
      if (!user || !recipe) return;
      const { error } = await supabase.from("meal_plan_items").insert({
        user_id: user.id,
        recipe_id: recipe.id,
        servings: currentServings,
        week_start: startOfWeekISO(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Added to this week's plan");
      qc.invalidateQueries({ queryKey: ["meal_plan"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">
          Sign in to view recipes
        </Link>
      </div>
    );
  }

  if (isLoading || !recipe) {
    return <div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div>;
  }

  return (
    <div>
      {/* Hero — image + content side by side, no overlap */}
      <div className="container mx-auto px-4 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="size-4" /> Back to recipes
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="rounded-3xl overflow-hidden bg-muted aspect-[4/3] lg:aspect-square shadow-sm">
            {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted-foreground">
                No image
              </div>
            )}
          </div>

          <div className="lg:pt-4">
            <span className="text-xs uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground">
              {recipe.category}
            </span>
            <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold leading-tight">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="mt-4 text-lg text-muted-foreground">{recipe.description}</p>
            )}

            <div className="mt-6 flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-spice" />
                <span>
                  <strong>{recipe.prep_time_min + recipe.cook_time_min}</strong> min total
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4 text-spice" />
                <span>
                  Serves <strong>{recipe.default_servings}</strong>
                </span>
              </span>
            </div>

            {/* Servings adjuster */}
            <div className="mt-8 p-5 rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">Adjust servings</div>
                  <div className="text-xs text-muted-foreground">
                    Ingredients scale automatically
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setServings(Math.max(1, currentServings - 1))}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={currentServings}
                    onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 text-center"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setServings(currentServings + 1)}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => addToWeek.mutate()}
                disabled={addToWeek.isPending}
                className="mt-4 w-full bg-spice text-spice-foreground hover:bg-spice/90"
              >
                <CalendarPlus className="size-4 mr-2" /> Add to this week
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Video (optional) */}
      {(recipe as any).video_url && (
        <div className="container mx-auto px-4 mt-10">
          <h2 className="font-display text-2xl font-semibold mb-4">Watch</h2>
          <ProtectedVideo
            url={(recipe as any).video_url}
            type={((recipe as any).video_type ?? "youtube") as "youtube" | "upload"}
            title={recipe.name}
          />
        </div>
      )}

      {/* Ingredients & instructions */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1">
            <h2 className="font-display text-2xl font-semibold mb-4">Ingredients</h2>
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between gap-3 py-2 border-b border-dashed">
                  <span className="text-sm">{ing.name}</span>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {formatQty(ing.qty * scale)} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-2">
            <h2 className="font-display text-2xl font-semibold mb-4">Instructions</h2>
            <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line leading-relaxed">
              {recipe.instructions || "No instructions provided."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatQty(n: number) {
  if (n >= 10) return Math.round(n).toString();
  return Math.round(n * 10) / 10 + "";
}

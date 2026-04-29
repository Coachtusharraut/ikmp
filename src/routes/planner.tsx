import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Clock, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";
import type { Recipe } from "@/lib/types";
import { startOfWeekISO, formatWeekRange } from "@/lib/types";

export const Route = createFileRoute("/planner")({
  component: Planner,
});

type PlanRow = {
  id: string;
  recipe_id: string;
  servings: number;
  times_per_week: number;
  week_start: string;
  recipes: Recipe;
};

function Planner() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const week = startOfWeekISO();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["meal_plan", week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_items")
        .select("id, recipe_id, servings, times_per_week, week_start, recipes(*)")
        .eq("week_start", week)
        .order("created_at");
      if (error) throw error;
      return data as unknown as PlanRow[];
    },
    enabled: !!user,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { servings?: number; times_per_week?: number } }) => {
      const { error } = await supabase
        .from("meal_plan_items")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal_plan", week] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meal_plan_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["meal_plan", week] });
    },
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">
          Sign in to plan meals
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Week of
          </div>
          <h1 className="font-display text-4xl font-semibold">{formatWeekRange(week)}</h1>
        </div>
        <Button asChild className="bg-spice text-spice-foreground hover:bg-spice/90">
          <Link to="/grocery">
            <ShoppingBasket className="size-4 mr-2" /> View grocery list
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No recipes picked yet for this week.
          </p>
          <Button asChild className="bg-spice text-spice-foreground hover:bg-spice/90">
            <Link to="/">Browse recipes</Link>
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it) => (
            <div key={it.id} className="bg-card border rounded-2xl overflow-hidden flex flex-col">
              <Link to="/recipe/$id" params={{ id: it.recipe_id }} className="block">
                <div className="aspect-[16/9] bg-muted overflow-hidden">
                  {it.recipes.image_url && (
                    <img
                      src={it.recipes.image_url}
                      alt={it.recipes.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </Link>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-display text-lg font-semibold leading-tight">
                  {it.recipes.name}
                </h3>
                <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3" />
                  {it.recipes.prep_time_min + it.recipes.cook_time_min} min
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">People</label>
                    <Input
                      type="number"
                      min={1}
                      value={it.servings}
                      onChange={(e) =>
                        updateItem.mutate({
                          id: it.id,
                          patch: { servings: Math.max(1, parseInt(e.target.value) || 1) },
                        })
                      }
                      className="h-9 text-center"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Times / week</label>
                    <Input
                      type="number"
                      min={1}
                      value={it.times_per_week ?? 1}
                      onChange={(e) =>
                        updateItem.mutate({
                          id: it.id,
                          patch: { times_per_week: Math.max(1, parseInt(e.target.value) || 1) },
                        })
                      }
                      className="h-9 text-center"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeItem.mutate(it.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

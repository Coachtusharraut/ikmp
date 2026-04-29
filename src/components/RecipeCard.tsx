import { Link } from "@tanstack/react-router";
import { Clock, Users, CalendarPlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Recipe } from "@/lib/types";
import { startOfWeekISO } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const addToWeek = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("meal_plan_items").insert({
        user_id: user.id,
        recipe_id: recipe.id,
        servings: 1,
        week_start: startOfWeekISO(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${recipe.name} added to this week`);
      qc.invalidateQueries({ queryKey: ["meal_plan"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToWeek.mutate();
  };

  return (
    <Link
      to="/recipe/$id"
      params={{ id: recipe.id }}
      className="group block rounded-2xl overflow-hidden bg-card border hover:border-spice/40 hover:shadow-lg transition-all"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
            {recipe.category}
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold leading-tight mb-1 group-hover:text-spice transition-colors">
          {recipe.name}
        </h3>
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{recipe.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {recipe.prep_time_min + recipe.cook_time_min} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5" /> {recipe.default_servings}
          </span>
        </div>
        {user && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAdd}
            disabled={addToWeek.isPending}
            className="mt-4 w-full hover:bg-spice hover:text-spice-foreground hover:border-spice"
          >
            <CalendarPlus className="size-3.5 mr-1.5" />
            {addToWeek.isPending ? "Adding…" : "Add to this week"}
          </Button>
        )}
      </div>
    </Link>
  );
}

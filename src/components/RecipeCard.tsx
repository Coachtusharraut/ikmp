import { Link } from "@tanstack/react-router";
import { Clock, Users } from "lucide-react";
import type { Recipe } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
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
      </div>
    </Link>
  );
}

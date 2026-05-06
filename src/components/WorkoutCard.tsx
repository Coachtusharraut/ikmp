import { Link } from "@tanstack/react-router";
import { Clock, Flame, Dumbbell } from "lucide-react";
import type { Workout } from "@/lib/workout-types";

export function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Link
      to="/workout/$id"
      params={{ id: workout.id }}
      className="group block rounded-2xl overflow-hidden bg-card border hover:border-spice/40 hover:shadow-lg transition-all"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {workout.image_url ? (
          <img
            src={workout.image_url}
            alt={workout.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <Dumbbell className="size-10 opacity-40" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
            {workout.category}
          </span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {workout.level}
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold leading-tight mb-1 group-hover:text-spice transition-colors">
          {workout.name}
        </h3>
        {workout.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{workout.description}</p>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> {workout.duration_min} min
          </span>
          {workout.calories != null && (
            <span className="flex items-center gap-1">
              <Flame className="size-3.5" /> {workout.calories} kcal
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

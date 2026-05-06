import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, Clock, Flame, Dumbbell } from "lucide-react";
import type { Workout } from "@/lib/workout-types";
import { ProtectedVideo } from "@/components/ProtectedVideo";

export const Route = createFileRoute("/workout/$id")({
  component: WorkoutDetail,
});

function WorkoutDetail() {
  const { id } = useParams({ from: "/workout/$id" });
  const { user } = useAuth();

  const { data: workout, isLoading } = useQuery({
    queryKey: ["workout", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workouts").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as Workout;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">Sign in to view workouts</Link>
      </div>
    );
  }

  if (isLoading || !workout) {
    return <div className="container mx-auto px-4 py-16 text-muted-foreground">Loading…</div>;
  }

  return (
    <div>
      <div className="container mx-auto px-4 pt-6">
        <Link to="/workouts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="size-4" /> Back to workouts
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="rounded-3xl overflow-hidden bg-muted aspect-[4/3] lg:aspect-square shadow-sm">
            {workout.image_url ? (
              <img src={workout.image_url} alt={workout.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted-foreground">
                <Dumbbell className="size-16 opacity-40" />
              </div>
            )}
          </div>

          <div className="lg:pt-4">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider px-2 py-1 rounded-full bg-accent text-accent-foreground">
                {workout.category}
              </span>
              <span className="text-xs uppercase tracking-wider px-2 py-1 rounded-full bg-muted text-muted-foreground">
                {workout.level}
              </span>
            </div>
            <h1 className="mt-4 font-display text-4xl md:text-5xl font-semibold leading-tight">
              {workout.name}
            </h1>
            {workout.description && (
              <p className="mt-4 text-lg text-muted-foreground">{workout.description}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-spice" />
                <strong>{workout.duration_min}</strong> min
              </span>
              {workout.calories != null && (
                <span className="flex items-center gap-2">
                  <Flame className="size-4 text-spice" />
                  <strong>{workout.calories}</strong> kcal
                </span>
              )}
              {workout.equipment && (
                <span className="flex items-center gap-2">
                  <Dumbbell className="size-4 text-spice" />
                  {workout.equipment}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {workout.video_url && (
        <div className="container mx-auto px-4 mt-10">
          <h2 className="font-display text-2xl font-semibold mb-4">Watch</h2>
          <ProtectedVideo
            url={workout.video_url}
            type={(workout.video_type ?? "youtube") as "youtube" | "upload"}
            title={workout.name}
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        <h2 className="font-display text-2xl font-semibold mb-4">Instructions</h2>
        <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line leading-relaxed">
          {workout.instructions || "No instructions provided."}
        </div>
      </div>
    </div>
  );
}

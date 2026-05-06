import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutCard } from "@/components/WorkoutCard";
import { Input } from "@/components/ui/input";
import { Search, Dumbbell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Workout, WorkoutSection, WorkoutSectionLink } from "@/lib/workout-types";

export const Route = createFileRoute("/workouts")({
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ["workouts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Workout[];
    },
    enabled: !!user,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["workout_sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sections")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as WorkoutSection[];
    },
    enabled: !!user,
  });

  const { data: links = [] } = useQuery({
    queryKey: ["workout_section_links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_section_links")
        .select("workout_id,section_id");
      if (error) throw error;
      return data as WorkoutSectionLink[];
    },
    enabled: !!user,
  });

  const sectionsByWorkout = useMemo(() => {
    const map = new Map<string, Set<string>>();
    links.forEach((l) => {
      if (!map.has(l.workout_id)) map.set(l.workout_id, new Set());
      map.get(l.workout_id)!.add(l.section_id);
    });
    return map;
  }, [links]);

  const categories = useMemo(() => ["All", ...sections.map((s) => s.name)], [sections]);

  const filtered = useMemo(() => {
    const target = sections.find((s) => s.name === cat);
    return workouts.filter((w) => {
      const okCat =
        cat === "All" ||
        (target && sectionsByWorkout.get(w.id)?.has(target.id)) ||
        w.category === cat;
      const okQ =
        !q ||
        w.name.toLowerCase().includes(q.toLowerCase()) ||
        w.description?.toLowerCase().includes(q.toLowerCase());
      return okCat && okQ;
    });
  }, [workouts, sections, sectionsByWorkout, q, cat]);

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-3 px-3 py-1.5 rounded-full bg-card border border-border/60">
          <Dumbbell className="size-3" /> Workouts
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-light tracking-tight">
          Move with intention
        </h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Explore curated workouts across strength, cardio, mobility and more.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h2 className="font-display text-2xl font-semibold">Workout library</h2>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search workouts…"
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
            to browse workouts.
          </p>
        </div>
      ) : isLoading ? (
        <div className="text-muted-foreground">Loading workouts…</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground">No workouts found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { Recipe, Ingredient } from "@/lib/types";
import { startOfWeekISO, formatWeekRange } from "@/lib/types";

export const Route = createFileRoute("/grocery")({
  component: Grocery,
});

type PlanRow = { servings: number; times_per_week: number; recipes: Recipe };

type AggItem = { name: string; unit: string; qty: number; sources: string[] };

function aggregate(rows: PlanRow[]): AggItem[] {
  const map = new Map<string, AggItem>();
  for (const row of rows) {
    const r = row.recipes;
    const times = Math.max(1, row.times_per_week ?? 1);
    // Scale per-meal by people; multiply by how many times it's cooked this week.
    const scale = (row.servings / r.default_servings) * times;
    for (const ing of r.ingredients as Ingredient[]) {
      const key = `${ing.name.toLowerCase()}|${ing.unit.toLowerCase()}`;
      const existing = map.get(key);
      const qty = ing.qty * scale;
      if (existing) {
        existing.qty += qty;
        if (!existing.sources.includes(r.name)) existing.sources.push(r.name);
      } else {
        map.set(key, { name: ing.name, unit: ing.unit, qty, sources: [r.name] });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function Grocery() {
  const { user } = useAuth();
  const settings = useSiteSettings();
  const week = startOfWeekISO();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Set the document title so the browser's "Save as PDF" filename uses your branding
  // instead of the default app name. Restore on unmount.
  useEffect(() => {
    const original = document.title;
    document.title = `Grocery List - ${settings.site_name} - ${formatWeekRange(week)}`;
    return () => {
      document.title = original;
    };
  }, [settings.site_name, week]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["meal_plan", week, "grocery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meal_plan_items")
        .select("servings, times_per_week, recipes(*)")
        .eq("week_start", week);
      if (error) throw error;
      return data as unknown as PlanRow[];
    },
    enabled: !!user,
  });

  const items = useMemo(() => aggregate(rows), [rows]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Link to="/login" className="text-spice underline">
          Sign in to view grocery list
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Grocery list · {formatWeekRange(week)}
          </div>
          <h1 className="font-display text-4xl font-semibold">Your week's shopping</h1>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="size-4 mr-2" /> Print
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="text-muted-foreground mb-4">
            Pick recipes for this week to generate your grocery list.
          </p>
          <Button asChild className="bg-spice text-spice-foreground hover:bg-spice/90">
            <Link to="/">Browse recipes</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl divide-y">
          {items.map((it, i) => {
            const id = `${it.name}-${it.unit}`;
            const isChecked = !!checked[id];
            return (
              <label
                key={i}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/30 transition"
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(v) => setChecked((c) => ({ ...c, [id]: !!v }))}
                />
                <div className={"flex-1 " + (isChecked ? "opacity-50 line-through" : "")}>
                  <div className="font-medium">{it.name}</div>
                  <div className="text-xs text-muted-foreground">
                    For: {it.sources.join(", ")}
                  </div>
                </div>
                <div className="text-sm font-medium tabular-nums text-muted-foreground">
                  {formatQty(it.qty)} {it.unit}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatQty(n: number) {
  if (n >= 10) return Math.round(n).toString();
  return Math.round(n * 10) / 10 + "";
}

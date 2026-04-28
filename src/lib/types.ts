export type Ingredient = { name: string; qty: number; unit: string };

export type Recipe = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  cuisine: string;
  image_url: string | null;
  prep_time_min: number;
  cook_time_min: number;
  default_servings: number;
  instructions: string | null;
  ingredients: Ingredient[];
  is_global: boolean;
  created_by: string | null;
};

export function startOfWeekISO(d = new Date()): string {
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // Monday-based
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export function formatWeekRange(iso: string): string {
  const start = new Date(iso);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

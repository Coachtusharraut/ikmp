import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { GraduationCap, PlayCircle, Lock } from "lucide-react";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Coach Tushar Raut" },
      {
        name: "description",
        content:
          "Holistic Indian-eating courses by Coach Tushar Raut. Free demo available — start learning today.",
      },
      { property: "og:title", content: "Courses — Coach Tushar Raut" },
      {
        property: "og:description",
        content:
          "Holistic Indian-eating courses by Coach Tushar Raut. Free demo available.",
      },
    ],
  }),
  component: CoursesPage,
});

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_free: boolean;
  is_published: boolean;
};

function CoursesPage() {
  const { user } = useAuth();

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title,description,thumbnail_url,price,is_free,is_published")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-spice mb-3">
          <GraduationCap className="size-3.5" /> Courses
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold leading-tight">
          Learn the Indian way to eat well
        </h1>
        <p className="mt-3 text-muted-foreground">
          Curated video courses by Coach Tushar Raut. Start with the free demo —
          no payment needed.
        </p>
      </div>

      {!user ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">
            <Link to="/login" className="text-spice underline underline-offset-4">
              Sign in
            </Link>{" "}
            to browse courses.
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-muted-foreground">No courses yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c) => (
            <Link
              key={c.id}
              to="/courses/$id"
              params={{ id: c.id }}
              className="group rounded-2xl border bg-card overflow-hidden hover:shadow-lg transition"
            >
              <div className="aspect-video bg-muted relative grid place-items-center">
                {c.thumbnail_url ? (
                  <img
                    src={c.thumbnail_url}
                    alt={c.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PlayCircle className="size-12 text-muted-foreground/40" />
                )}
                <div className="absolute top-3 right-3">
                  {c.is_free ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-spice text-spice-foreground">
                      Free
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-foreground text-background flex items-center gap-1">
                      <Lock className="size-3" /> ₹{c.price}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-spice transition">
                  {c.title}
                </h3>
                {c.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {c.description}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

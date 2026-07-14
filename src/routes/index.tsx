import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  PlayCircle,
  UtensilsCrossed,
  Dumbbell,
  GraduationCap,
  Video,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { ProtectedVideo } from "@/components/ProtectedVideo";

export const Route = createFileRoute("/")({
  component: Home,
});

const EXPLORE = [
  {
    to: "/recipes" as const,
    label: "Recipes",
    icon: UtensilsCrossed,
    desc: "Curated Indian recipes for holistic health.",
  },
  {
    to: "/workouts" as const,
    label: "Workouts",
    icon: Dumbbell,
    desc: "Guided sessions you can do anywhere.",
  },
  {
    to: "/courses" as const,
    label: "Courses",
    icon: GraduationCap,
    desc: "Deep-dive programs to transform your habits.",
  },
  {
    to: "/live" as const,
    label: "Live",
    icon: Video,
    desc: "Join upcoming live sessions with the coach.",
  },
];

function Home() {
  const { user } = useAuth();
  const settings = useSiteSettings();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: "var(--gradient-warm)" }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 size-96 rounded-full blur-3xl opacity-40 -z-10"
          style={{ background: "var(--gradient-spice)" }}
        />
        <div className="container mx-auto px-4 pt-16 md:pt-24 pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-5 px-3 py-1.5 rounded-full bg-card/60 backdrop-blur border border-border/60">
              <Sparkles className="size-3" /> {settings.site_name} · {settings.tagline}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-light leading-[1.02] tracking-[-0.03em]">
              {settings.hero_title}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              {settings.hero_subtitle}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
              {user ? (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="bg-spice text-spice-foreground hover:bg-spice/90 rounded-full px-8 h-14 text-base font-semibold tracking-wide shadow-[0_10px_40px_-10px_hsl(var(--spice)/0.6)]"
                  >
                    <Link to="/my-plan">
                      Continue to your plan <ArrowRight className="size-4 ml-1" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="rounded-full">
                    <Link to="/recipes">Browse recipes</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="bg-spice text-spice-foreground hover:bg-spice/90 rounded-full px-8 h-14 text-base font-semibold tracking-wide shadow-[0_10px_40px_-10px_hsl(var(--spice)/0.6)] hover:shadow-[0_14px_50px_-10px_hsl(var(--spice)/0.75)] transition-shadow"
                  >
                    <Link to="/login">Sign in to get started →</Link>
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Free to join · takes less than a minute
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Intro video */}
      {settings.intro_video_url && (
        <section className="container mx-auto px-4 pt-4 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-3 px-3 py-1.5 rounded-full bg-card border border-border/60">
                <PlayCircle className="size-3" /> Watch first
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight">
                {settings.intro_title}
              </h2>
              {settings.intro_subtitle && (
                <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
                  {settings.intro_subtitle}
                </p>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)] border border-border/60">
              <ProtectedVideo
                url={settings.intro_video_url}
                type={settings.intro_video_type}
                title={settings.intro_title}
              />
            </div>
          </div>
        </section>
      )}

      {/* Explore */}
      <section className="container mx-auto px-4 pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-spice mb-2">
              Explore
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-light tracking-tight">
              Everything you need in one place
            </h2>
          </div>
          {user && (
            <Link
              to="/my-plan"
              className="hidden sm:inline-flex items-center gap-1 text-sm text-spice hover:underline"
            >
              <ClipboardList className="size-4" /> My Plan
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {EXPLORE.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group rounded-2xl border bg-card p-5 sm:p-6 hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5 transition"
            >
              <div className="size-11 rounded-xl bg-spice/10 text-spice grid place-items-center mb-4 group-hover:bg-spice group-hover:text-spice-foreground transition">
                <s.icon className="size-5" />
              </div>
              <div className="font-display text-lg font-semibold">{s.label}</div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {s.desc}
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-spice">
                Open <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>

        {!user && (
          <div className="mt-10 rounded-3xl border bg-card p-8 sm:p-10 text-center">
            <h3 className="font-display text-2xl md:text-3xl font-light">
              Ready to start?
            </h3>
            <p className="text-muted-foreground mt-2">
              Sign in to unlock recipes, plans and your weekly grocery list.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-5 bg-spice text-spice-foreground hover:bg-spice/90 rounded-full px-10 h-12 shadow-[var(--shadow-elegant)]"
            >
              <Link to="/login">Sign in to get started →</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

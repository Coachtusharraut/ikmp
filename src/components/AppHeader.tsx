import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import { ChefHat, LogOut, ShieldCheck } from "lucide-react";

export function AppHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const settings = useSiteSettings();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={settings.site_name}
              className="size-9 rounded-xl object-cover shadow-sm"
            />
          ) : (
            <div className="size-9 rounded-xl bg-spice text-spice-foreground grid place-items-center shadow-sm">
              <ChefHat className="size-5" />
            </div>
          )}
          <div className="leading-tight">
            <div className="font-display text-base sm:text-lg font-semibold">{settings.site_name}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground -mt-0.5">
              {settings.tagline}
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-2 text-sm text-foreground font-medium" }} activeOptions={{ exact: true }}>
            Recipes
          </Link>
          {user && (
            <>
              <Link to="/planner" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-2 text-sm text-foreground font-medium" }}>
                This Week
              </Link>
              <Link to="/grocery" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-2 text-sm text-foreground font-medium" }}>
                Grocery list
              </Link>
              {isAdmin && (
                <Link to="/admin" className="px-3 py-2 text-sm text-spice hover:opacity-80 transition flex items-center gap-1" activeProps={{ className: "px-3 py-2 text-sm text-spice font-medium flex items-center gap-1" }}>
                  <ShieldCheck className="size-4" /> Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden sm:block text-xs text-muted-foreground max-w-[160px] truncate">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/login" });
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="bg-spice text-spice-foreground hover:bg-spice/90">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChefHat, LogOut, ShieldCheck, Menu, GraduationCap, Sparkles } from "lucide-react";

export function AppHeader() {
  const { user, isAdmin, isCoach, signOut } = useAuth();
  const router = useRouter();
  const settings = useSiteSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    router.navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile hamburger (left side) */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden -ml-2" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="font-display">{settings.site_name}</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                <SheetClose asChild>
                  <Link to="/" className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                    Recipes
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link to="/courses" className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                    Courses
                  </Link>
                </SheetClose>
                {user && (
                  <>
                    <SheetClose asChild>
                      <Link to="/planner" className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                        This Week
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/grocery" className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent">
                        Grocery list
                      </Link>
                    </SheetClose>
                    {isCoach && !isAdmin && (
                      <SheetClose asChild>
                        <Link to="/coach" className="px-3 py-2 rounded-md text-sm text-spice hover:bg-accent flex items-center gap-2">
                          <Sparkles className="size-4" /> Coach studio
                        </Link>
                      </SheetClose>
                    )}
                    {isAdmin && (
                      <SheetClose asChild>
                        <Link to="/admin" className="px-3 py-2 rounded-md text-sm text-spice hover:bg-accent flex items-center gap-2">
                          <ShieldCheck className="size-4" /> Admin
                        </Link>
                      </SheetClose>
                    )}
                  </>
                )}
              </nav>
              <div className="mt-6 border-t pt-4">
                {user ? (
                  <>
                    <div className="px-3 text-xs text-muted-foreground truncate mb-2">{user.email}</div>
                    <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
                      <LogOut className="size-4 mr-2" /> Sign out
                    </Button>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Button asChild size="sm" className="w-full bg-spice text-spice-foreground hover:bg-spice/90">
                      <Link to="/login">Sign in</Link>
                    </Button>
                  </SheetClose>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2 group min-w-0">
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
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-2 text-sm text-foreground font-medium" }} activeOptions={{ exact: true }}>
            Recipes
          </Link>
          <Link to="/courses" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition flex items-center gap-1" activeProps={{ className: "px-3 py-2 text-sm text-foreground font-medium flex items-center gap-1" }}>
            <GraduationCap className="size-4" /> Courses
          </Link>
          {user && (
            <>
              <Link to="/planner" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-2 text-sm text-foreground font-medium" }}>
                This Week
              </Link>
              <Link to="/grocery" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition" activeProps={{ className: "px-3 py-2 text-sm text-foreground font-medium" }}>
                Grocery list
              </Link>
              {isCoach && !isAdmin && (
                <Link to="/coach" className="px-3 py-2 text-sm text-spice hover:opacity-80 transition flex items-center gap-1" activeProps={{ className: "px-3 py-2 text-sm text-spice font-medium flex items-center gap-1" }}>
                  <Sparkles className="size-4" /> Coach
                </Link>
              )}
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
              <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={handleSignOut}>
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="hidden md:inline-flex bg-spice text-spice-foreground hover:bg-spice/90">
              <Link to="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

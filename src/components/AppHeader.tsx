import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSiteSettings } from "@/lib/site-settings";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ChefHat,
  LogOut,
  ShieldCheck,
  Menu,
  GraduationCap,
  Sparkles,
  Dumbbell,
  Video,
  UtensilsCrossed,
  CalendarDays,
  ClipboardList,
  ShoppingBasket,
  User as UserIcon,
} from "lucide-react";
import { PushSubscribeButton } from "@/components/PushSubscribeButton";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  accent?: boolean;
};

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

  const publicNav: NavItem[] = [
    { to: "/", label: "Recipes", icon: UtensilsCrossed, exact: true },
    { to: "/workouts", label: "Workouts", icon: Dumbbell },
    { to: "/courses", label: "Courses", icon: GraduationCap },
    { to: "/live", label: "Live", icon: Video },
  ];

  const memberNav: NavItem[] = [
    { to: "/my-plan", label: "My Plan", icon: ClipboardList },
    { to: "/planner", label: "This Week", icon: CalendarDays },
    { to: "/grocery", label: "Grocery", icon: ShoppingBasket },
  ];

  const staffNav: NavItem[] = [];
  if (user && isCoach && !isAdmin)
    staffNav.push({ to: "/coach", label: "Coach", icon: Sparkles, accent: true });
  if (user && isAdmin)
    staffNav.push({ to: "/admin", label: "Admin", icon: ShieldCheck, accent: true });

  const desktopNav = user ? [...publicNav, ...memberNav, ...staffNav] : publicNav;

  const emailInitial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <TooltipProvider delayDuration={150}>
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -ml-2"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="font-display">{settings.site_name}</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-1">
                  {publicNav.map((n) => (
                    <SheetClose asChild key={n.to}>
                      <Link
                        to={n.to}
                        className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent flex items-center gap-2"
                        activeProps={{
                          className:
                            "px-3 py-2 rounded-md text-sm bg-spice text-spice-foreground font-semibold shadow-sm flex items-center gap-2",
                        }}
                        activeOptions={n.exact ? { exact: true } : undefined}
                      >
                        <n.icon className="size-4" /> {n.label}
                      </Link>
                    </SheetClose>
                  ))}
                  {user &&
                    memberNav.map((n) => (
                      <SheetClose asChild key={n.to}>
                        <Link
                          to={n.to}
                          className="px-3 py-2 rounded-md text-sm text-foreground hover:bg-accent flex items-center gap-2"
                          activeProps={{
                            className:
                              "px-3 py-2 rounded-md text-sm bg-spice text-spice-foreground font-semibold shadow-sm flex items-center gap-2",
                          }}
                        >
                          <n.icon className="size-4" /> {n.label}
                        </Link>
                      </SheetClose>
                    ))}
                  {staffNav.map((n) => (
                    <SheetClose asChild key={n.to}>
                      <Link
                        to={n.to}
                        className="px-3 py-2 rounded-md text-sm text-spice hover:bg-accent flex items-center gap-2"
                        activeProps={{
                          className:
                            "px-3 py-2 rounded-md text-sm bg-spice text-spice-foreground font-semibold shadow-sm flex items-center gap-2",
                        }}
                      >
                        <n.icon className="size-4" /> {n.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>
                <div className="mt-6 border-t pt-4">
                  {user ? (
                    <>
                      <div className="px-3 text-xs text-muted-foreground truncate mb-2">
                        {user.email}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleSignOut}
                      >
                        <LogOut className="size-4 mr-2" /> Sign out
                      </Button>
                    </>
                  ) : (
                    <SheetClose asChild>
                      <Button
                        asChild
                        size="sm"
                        className="w-full bg-spice text-spice-foreground hover:bg-spice/90"
                      >
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
                  className="size-8 sm:size-9 rounded-xl object-cover shadow-sm shrink-0"
                />
              ) : (
                <div className="size-8 sm:size-9 rounded-xl bg-spice text-spice-foreground grid place-items-center shadow-sm shrink-0">
                  <ChefHat className="size-4 sm:size-5" />
                </div>
              )}
              <div className="leading-tight min-w-0">
                <div className="font-display text-sm sm:text-base font-semibold truncate max-w-[110px] sm:max-w-none">
                  {settings.site_name}
                </div>
                <div className="hidden md:block text-[10px] uppercase tracking-[0.18em] text-muted-foreground -mt-0.5 truncate">
                  {settings.tagline}
                </div>
              </div>
            </Link>
          </div>

          {/* Center: icon-only nav on desktop */}
          <nav className="hidden md:flex items-center gap-0.5">
            {desktopNav.map((n) => (
              <Tooltip key={n.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={n.to}
                    aria-label={n.label}
                    className={
                      "size-10 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition " +
                      (n.accent ? "text-spice " : "")
                    }
                    activeProps={{
                      className:
                        "size-10 grid place-items-center rounded-full bg-spice text-spice-foreground shadow-sm",
                    }}
                    activeOptions={n.exact ? { exact: true } : undefined}
                  >
                    <n.icon className="size-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {n.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>

          {/* Right: notifications + account */}
          <div className="flex items-center gap-1.5">
            {user && (
              <div className="hidden sm:inline-flex">
                <PushSubscribeButton />
              </div>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Account menu"
                    className="size-9 rounded-full bg-gradient-to-br from-spice to-spice/70 text-spice-foreground grid place-items-center text-sm font-semibold shadow-sm ring-1 ring-border/60 hover:ring-spice/40 transition"
                  >
                    {emailInitial}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-xs text-muted-foreground">Signed in as</div>
                    <div className="text-sm font-medium truncate">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/my-plan" className="cursor-pointer">
                      <ClipboardList className="size-4 mr-2" /> My Plan
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer text-spice">
                        <ShieldCheck className="size-4 mr-2" /> Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                    <LogOut className="size-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                asChild
                size="sm"
                className="bg-spice text-spice-foreground hover:bg-spice/90 rounded-full px-4 sm:px-5 h-9 shadow-[0_0_0_0_hsl(var(--spice)/0.6)] hover:shadow-[0_0_0_6px_hsl(var(--spice)/0.15)] transition-shadow"
              >
                <Link to="/login">
                  <UserIcon className="size-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Sign in</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}

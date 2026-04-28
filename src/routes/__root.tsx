import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { SiteSettingsProvider } from "@/lib/site-settings";
import { AppHeader } from "@/components/AppHeader";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Coach Tushar Raut — Indian Kitchen Meal Plan" },
      { name: "description", content: "Lose weight & achieve holistic health with curated Indian recipes, weekly meal plans and smart grocery lists by Coach Tushar Raut." },
      { name: "author", content: "Coach Tushar Raut" },
      { property: "og:title", content: "Coach Tushar Raut — Indian Kitchen Meal Plan" },
      { property: "og:description", content: "Lose weight & achieve holistic health with curated Indian recipes, weekly meal plans and smart grocery lists by Coach Tushar Raut." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Coach Tushar Raut — Indian Kitchen Meal Plan" },
      { name: "twitter:description", content: "Lose weight & achieve holistic health with curated Indian recipes, weekly meal plans and smart grocery lists by Coach Tushar Raut." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d97ee50a-1cb8-49c6-a127-8cc42a5c622a/id-preview-0b61149d--9b43dc33-a891-4c1c-b4c8-79fae9535045.lovable.app-1777383761097.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d97ee50a-1cb8-49c6-a127-8cc42a5c622a/id-preview-0b61149d--9b43dc33-a891-4c1c-b4c8-79fae9535045.lovable.app-1777383761097.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [qc] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <SiteSettingsProvider>
          <div className="min-h-screen flex flex-col">
            <AppHeader />
            <main className="flex-1">
              <Outlet />
            </main>
          </div>
          <Toaster richColors position="top-center" />
        </SiteSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

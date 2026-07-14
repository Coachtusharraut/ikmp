## Goals
1. Home page (`/`) becomes a proper landing page — distinct from the recipe library.
2. Recipe library moves to its own route `/recipes`.
3. Logo (Coach Tushar Raut) in the header always links to `/` (home).
4. Header nav items show **labels + icons** (not tiny icon‑only tooltips) and are managed from the Admin panel — add, edit, delete, reorder, change icon, change label, change link.

## Routing changes
- New `src/routes/recipes.tsx` — moves the current library UI (search, category chips, recipe grid) out of `/`.
- `src/routes/index.tsx` — rewritten as a landing home page:
  - Hero (title/subtitle from `site_settings`)
  - Intro video block (already exists)
  - "Explore" section with cards linking to Recipes, Workouts, Courses, Live
  - Prominent Sign‑in CTA for logged‑out users; "Continue to your plan" for logged‑in
- `AppHeader` logo → always `to="/"`.

## Editable navigation
New table `public.nav_items`:
- `id`, `label`, `href`, `icon` (lucide icon name string), `sort_order`, `visibility` (`public` | `member` | `admin` | `coach`), `is_active`, timestamps
- Public read, admin write (RLS).
- Seeded with current items: Home, Recipes, Workouts, Courses, Live, My Plan, This Week, Grocery, Coach, Admin.

Client:
- `src/lib/nav.ts` — icon-name → lucide component map (curated whitelist of ~30 icons) + `useNavItems()` hook.
- `AppHeader` renders items from DB, filtered by auth state / role. Desktop: pill buttons with icon + label. Mobile sheet: same list.

## Admin editor
New route `src/routes/admin-nav.tsx` (linked from `admin.tsx`):
- Table of nav items with drag-free up/down reorder buttons, inline edit (label/href/visibility/active), icon picker (grid of allowed lucide icons), add, delete.
- Uses standard supabase client with RLS.

## Files
- Create: `src/routes/recipes.tsx`, `src/routes/admin-nav.tsx`, `src/lib/nav.ts`
- Edit: `src/routes/index.tsx`, `src/components/AppHeader.tsx`, `src/routes/admin.tsx` (add link to nav editor)
- Migration: create `nav_items` table + grants + RLS + seed rows.

## Technical notes
- Icon whitelist keeps bundle predictable and picker simple.
- `visibility='public'` shows to everyone; `member` requires signed-in user; `coach`/`admin` require the respective role.
- Existing routes and links stay working; only `/` content changes and recipes gain a dedicated URL.

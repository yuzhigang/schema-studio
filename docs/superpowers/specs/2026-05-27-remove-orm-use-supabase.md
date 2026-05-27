# Remove Drizzle ORM, Use Supabase

## Goal

Remove all Drizzle ORM related code and dependencies from the project, replacing the database layer and authentication with Supabase.

## Current State

- Monorepo with `apps/web`, `packages/db`, `packages/auth`, `packages/ui`
- `packages/db` uses Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres`) with schema definitions
- `packages/auth` uses `better-auth` with `@better-auth/drizzle-adapter`
- `apps/web` has email/password login, signup, and social OAuth via better-auth

## Target State

- `packages/db` exports Supabase clients (server + browser)
- `packages/auth` provides Supabase auth utilities (hooks, middleware, queries)
- `apps/web` uses Supabase Auth with GitHub and Microsoft OAuth only (no email/password)
- All Drizzle ORM and better-auth dependencies removed

## Architecture

### packages/db

Remove all Drizzle-specific code. Keep the package as a thin wrapper exporting Supabase clients:

- `src/server.ts` — server-side Supabase client (`@supabase/supabase-js`)
- `src/browser.ts` — browser-side Supabase client
- Remove: `drizzle.config.ts`, `src/schema/`, Drizzle imports in `src/index.ts`

### packages/auth

Replace better-auth with Supabase Auth helpers:

- `src/supabase-auth.ts` — re-export auth utilities
- `src/tanstack/functions.ts` — server functions using Supabase session
- `src/tanstack/middleware.ts` — auth middleware using Supabase
- `src/tanstack/queries.ts` — TanStack Query options for auth
- `src/tanstack/hooks.ts` — React hooks for auth state
- Remove: `src/auth.ts`, `src/auth-client.ts`, better-auth dependency

### apps/web

- Remove `drizzle-orm` and `@repo/db` schema imports
- Remove email/password login and signup forms
- Create OAuth-only login page with GitHub and Microsoft buttons
- Update protected routes (`_auth/*`) to use Supabase session checks
- Remove `/api/auth/$` route (Supabase handles auth via its own API)
- Update `__root.tsx` context type

## Auth Flow

1. User clicks GitHub/Microsoft login button
2. `supabase.auth.signInWithOAuth({ provider: 'github' | 'azure' })` called
3. Supabase redirects to OAuth provider
4. Callback handled by Supabase, session established
5. Client-side auth state managed via TanStack Query + Supabase listeners
6. Protected routes check session via server function

## Dependencies

### Add

- `@supabase/supabase-js`
- `@supabase/ssr` (if needed for TanStack Start SSR)

### Remove

- `drizzle-orm`
- `drizzle-kit`
- `postgres`
- `better-auth`
- `@better-auth/drizzle-adapter`

## Environment Variables

Replace database/auth env vars with Supabase:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Remove: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

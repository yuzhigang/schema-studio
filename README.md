# schema-studio

Schema Studio is a TanStack Start monorepo for building a schema design workspace with Supabase
authentication and shared UI packages.

## Stack

- TypeScript, React 19, TanStack Start, TanStack Router, TanStack Query
- Vite+, pnpm workspaces, shared pnpm catalog versions
- Tailwind CSS, shadcn/ui-style primitives, Base UI, lucide-react
- Supabase Auth with GitHub and Microsoft OAuth
- Cloudflare Pages-ready Nitro output

## Workspace

```text
apps/
  web/          TanStack Start web app
packages/
  auth/         Supabase auth helpers, server functions, route query hooks
  db/           Supabase browser, server, and SSR clients
  ui/           Shared UI primitives and theme utilities
tooling/
  tsconfig/     Shared TypeScript configuration
```

## Requirements

- Node.js 22 or newer
- pnpm 11
- Vite+ `vp`

Install Vite+ if needed:

```sh
pnpm add -g vite-plus
```

## Environment

Create local environment variables before running the app:

```sh
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For Cloudflare Pages, configure the same values in the project environment settings. See
[`apps/web/wrangler.toml`](./apps/web/wrangler.toml).

## Development

Install dependencies after pulling changes:

```sh
vp install
```

Run the web app:

```sh
pnpm dev:web
```

Common validation commands:

```sh
pnpm check
pnpm lint
pnpm build:web
```

Vitest is available through Vite+, but the repository currently has no test files.

## Useful Scripts

- `pnpm check` - format, lint, and type-check through Vite+
- `pnpm lint` - type-aware lint and type-check
- `pnpm format` - format files with Oxfmt
- `pnpm build:web` - build the TanStack Start web app
- `pnpm ui add <component>` - add shared UI primitives through the shadcn CLI
- `pnpm tanstack ... --json` - query TanStack documentation

## Auth Notes

Route guards under `apps/web/src/routes/_auth` protect page rendering. Server functions that require
authentication must also use `authMiddleware` from `@repo/auth/tanstack/middleware`; route guards do
not protect RPC endpoints by themselves.

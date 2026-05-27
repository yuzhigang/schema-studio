# Remove Drizzle ORM, Use Supabase Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all Drizzle ORM and better-auth code, replace with Supabase (database + auth), keeping only GitHub and Microsoft OAuth login.

**Architecture:** `packages/db` becomes a thin Supabase client wrapper. `packages/auth` provides Supabase auth hooks/middleware for TanStack Start. `apps/web` uses Supabase OAuth for login and session-based route protection.

**Tech Stack:** Supabase, TanStack Start, React, TypeScript

---

## File Structure

| File                                                | Action | Responsibility                              |
| --------------------------------------------------- | ------ | ------------------------------------------- |
| `pnpm-workspace.yaml`                               | Modify | Remove drizzle/better-auth from catalog     |
| `package.json` (root)                               | Modify | Remove db/auth scripts                      |
| `packages/db/package.json`                          | Modify | Replace deps with `@supabase/supabase-js`   |
| `packages/db/src/server.ts`                         | Create | Server-side Supabase client                 |
| `packages/db/src/browser.ts`                        | Create | Browser-side Supabase client                |
| `packages/db/src/index.ts`                          | Modify | Re-export clients instead of Drizzle db     |
| `packages/db/src/schema/*`                          | Delete | All Drizzle schema files                    |
| `packages/db/drizzle.config.ts`                     | Delete | Drizzle kit config                          |
| `packages/auth/package.json`                        | Modify | Replace better-auth with supabase deps      |
| `packages/auth/src/supabase-auth.ts`                | Create | Supabase auth server/client setup           |
| `packages/auth/src/tanstack/functions.ts`           | Modify | Use Supabase session instead of better-auth |
| `packages/auth/src/tanstack/middleware.ts`          | Modify | Use Supabase session                        |
| `packages/auth/src/tanstack/queries.ts`             | Modify | Use Supabase auth query                     |
| `packages/auth/src/tanstack/hooks.ts`               | Modify | Use Supabase auth state                     |
| `packages/auth/src/auth.ts`                         | Delete | better-auth config                          |
| `packages/auth/src/auth-client.ts`                  | Delete | better-auth client                          |
| `apps/web/package.json`                             | Modify | Remove drizzle-orm, update deps             |
| `apps/web/src/routes/__root.tsx`                    | Modify | Update context type for Supabase user       |
| `apps/web/src/routes/_auth/route.tsx`               | Modify | Use Supabase session check                  |
| `apps/web/src/routes/_guest/route.tsx`              | Modify | Use Supabase session check                  |
| `apps/web/src/routes/_auth/app/index.tsx`           | Modify | Use Supabase user shape                     |
| `apps/web/src/routes/_guest/login.tsx`              | Modify | OAuth-only login page (GitHub + Microsoft)  |
| `apps/web/src/routes/_guest/signup.tsx`             | Delete | No email signup needed                      |
| `apps/web/src/routes/api/auth/$.ts`                 | Delete | Supabase handles auth API                   |
| `apps/web/src/components/sign-in-social-button.tsx` | Modify | Use Supabase OAuth                          |
| `apps/web/src/components/sign-out-button.tsx`       | Modify | Use Supabase signOut                        |
| `apps/web/src/router.tsx`                           | Modify | Remove better-auth references               |

---

### Task 1: Clean up workspace-level dependencies

**Files:**

- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (root)

**Context:** The workspace uses pnpm catalog for shared dependency versions. We need to remove all Drizzle and better-auth entries.

- [ ] **Step 1: Remove Drizzle/better-auth from pnpm catalog**

Remove these lines from `pnpm-workspace.yaml` catalog section:

- `"@better-auth/drizzle-adapter": ...`
- `better-auth: ...`
- `drizzle-kit: ...`
- `drizzle-orm: ...`
- `postgres: ...`

Also remove from `overrides`:

- `"@better-auth/drizzle-adapter": "catalog:"`

And remove the `blockExoticSubdeps` workaround comment and setting.

- [ ] **Step 2: Remove db/auth scripts from root package.json**

In root `package.json`, remove these scripts:

- `"db": "vp run --filter=@repo/db db"`
- `"auth:secret": "vpx auth@latest secret"`
- `"auth:generate": "vp run --filter=@repo/db auth:generate"`

- [ ] **Step 3: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: remove drizzle and better-auth from workspace catalog"
```

---

### Task 2: Rewrite packages/db as Supabase client wrapper

**Files:**

- Modify: `packages/db/package.json`
- Create: `packages/db/src/server.ts`
- Create: `packages/db/src/browser.ts`
- Modify: `packages/db/src/index.ts`
- Delete: `packages/db/drizzle.config.ts`
- Delete: `packages/db/src/schema/auth.schema.ts`
- Delete: `packages/db/src/schema/relations.ts`
- Delete: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Update packages/db/package.json**

```json
{
  "name": "@repo/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./browser": "./src/browser.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:"
  }
}
```

- [ ] **Step 2: Create packages/db/src/server.ts**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

- [ ] **Step 3: Create packages/db/src/browser.ts**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClient(supabaseUrl!, supabaseAnonKey!);
```

- [ ] **Step 4: Rewrite packages/db/src/index.ts**

```typescript
export { supabaseServer } from "./server";
export { supabaseBrowser } from "./browser";
```

- [ ] **Step 5: Delete Drizzle-specific files**

Delete:

- `packages/db/drizzle.config.ts`
- `packages/db/src/schema/auth.schema.ts`
- `packages/db/src/schema/relations.ts`
- `packages/db/src/schema/index.ts`

Also delete the empty `schema` directory if needed.

- [ ] **Step 6: Commit**

```bash
git add packages/db/
git commit -m "refactor(db): replace drizzle with supabase clients"
```

---

### Task 3: Rewrite packages/auth for Supabase Auth

**Files:**

- Modify: `packages/auth/package.json`
- Create: `packages/auth/src/supabase-auth.ts`
- Modify: `packages/auth/src/tanstack/functions.ts`
- Modify: `packages/auth/src/tanstack/middleware.ts`
- Modify: `packages/auth/src/tanstack/queries.ts`
- Modify: `packages/auth/src/tanstack/hooks.ts`
- Delete: `packages/auth/src/auth.ts`
- Delete: `packages/auth/src/auth-client.ts`

- [ ] **Step 1: Update packages/auth/package.json**

```json
{
  "name": "@repo/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./*": "./src/*.ts"
  },
  "dependencies": {
    "@repo/db": "workspace:*"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "@types/node": "catalog:",
    "typescript": "catalog:"
  },
  "peerDependencies": {
    "@tanstack/react-query": "catalog:",
    "@tanstack/react-start": "catalog:"
  }
}
```

- [ ] **Step 2: Create packages/auth/src/supabase-auth.ts**

```typescript
import { supabaseBrowser } from "@repo/db/browser";
import { supabaseServer } from "@repo/db/server";

export { supabaseBrowser, supabaseServer };
```

- [ ] **Step 3: Rewrite tanstack/functions.ts**

```typescript
import { createServerFn } from "@tanstack/react-start";
import { supabaseServer } from "@repo/db/server";

export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  return user;
});
```

- [ ] **Step 4: Rewrite tanstack/middleware.ts**

```typescript
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { supabaseServer } from "@repo/db/server";

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  if (!user) {
    setResponseStatus(401);
    throw new Error("Unauthorized");
  }

  return next({ context: { user } });
});
```

- [ ] **Step 5: Rewrite tanstack/queries.ts**

```typescript
import { queryOptions } from "@tanstack/react-query";
import { $getUser } from "./functions";

export const authQueryOptions = () =>
  queryOptions({
    queryKey: ["auth"],
    queryFn: ({ signal }) => $getUser({ signal }),
  });

export type AuthQueryResult = Awaited<ReturnType<typeof $getUser>>;
```

- [ ] **Step 6: Rewrite tanstack/hooks.ts**

```typescript
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { authQueryOptions } from "./queries";

export function useAuth() {
  const { data: user, isPending } = useQuery(authQueryOptions());
  return { user, isPending };
}

export function useAuthSuspense() {
  const { data: user } = useSuspenseQuery(authQueryOptions());
  return { user };
}
```

- [ ] **Step 7: Delete old auth files**

Delete:

- `packages/auth/src/auth.ts`
- `packages/auth/src/auth-client.ts`

- [ ] **Step 8: Commit**

```bash
git add packages/auth/
git commit -m "refactor(auth): replace better-auth with supabase auth"
```

---

### Task 4: Update apps/web dependencies and remove API route

**Files:**

- Modify: `apps/web/package.json`
- Delete: `apps/web/src/routes/api/auth/$.ts`

- [ ] **Step 1: Update apps/web/package.json**

Remove these dependencies:

- `"drizzle-orm": "catalog:"`

Keep `@repo/auth` and `@repo/db` (they now export Supabase clients).

- [ ] **Step 2: Delete API auth route**

Delete `apps/web/src/routes/api/auth/$.ts`.

Remove the empty `apps/web/src/routes/api/auth/` directory if needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/
git commit -m "chore(web): remove drizzle-orm dep and better-auth api route"
```

---

### Task 5: Update auth UI components for Supabase

**Files:**

- Modify: `apps/web/src/components/sign-in-social-button.tsx`
- Modify: `apps/web/src/components/sign-out-button.tsx`

- [ ] **Step 1: Rewrite sign-in-social-button.tsx**

```typescript
import { Button } from "@repo/ui/components/button";
import { supabaseBrowser } from "@repo/db/browser";

interface SocialLoginButtonProps {
  provider: "github" | "azure";
  icon: React.ReactNode;
  disabled?: boolean;
  callbackURL: string;
}

export function SignInSocialButton(props: SocialLoginButtonProps) {
  const providerLabel = props.provider === "azure" ? "Microsoft" : "GitHub";

  const handleSignIn = async () => {
    await supabaseBrowser.auth.signInWithOAuth({
      provider: props.provider,
      options: {
        redirectTo: props.callbackURL,
      },
    });
  };

  return (
    <Button
      variant="secondary"
      className="w-full"
      type="button"
      disabled={props.disabled}
      onClick={handleSignIn}
    >
      {props.icon}
      Login with {providerLabel}
    </Button>
  );
}
```

- [ ] **Step 2: Rewrite sign-out-button.tsx**

```typescript
import { supabaseBrowser } from "@repo/db/browser";
import { authQueryOptions } from "@repo/auth/tanstack/queries";
import { Button } from "@repo/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export function SignOutButton() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (
    <Button
      onClick={async () => {
        await supabaseBrowser.auth.signOut();
        queryClient.setQueryData(authQueryOptions().queryKey, null);
        await router.invalidate();
      }}
      type="button"
      className="w-fit"
      variant="destructive"
      size="lg"
    >
      Sign out
    </Button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/
git commit -m "refactor(web): update auth components for supabase"
```

---

### Task 6: Update login page (OAuth only)

**Files:**

- Modify: `apps/web/src/routes/_guest/login.tsx`
- Delete: `apps/web/src/routes/_guest/signup.tsx`

- [ ] **Step 1: Rewrite login.tsx as OAuth-only page**

```typescript
import { SiGithub } from "@icons-pack/react-simple-icons";
import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GalleryVerticalEndIcon } from "lucide-react";

import { SignInSocialButton } from "#/components/sign-in-social-button";

export const Route = createFileRoute("/_guest/login")({
  component: LoginPage,
});

function LoginPage() {
  const { redirectUrl } = Route.useRouteContext();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2">
        <Link to="/" className="flex flex-col items-center gap-2 font-medium">
          <div className="flex h-8 w-8 items-center justify-center rounded-md">
            <GalleryVerticalEndIcon className="size-6" />
          </div>
          <span className="sr-only">Acme Inc.</span>
        </Link>
        <h1 className="text-xl font-bold">Welcome back to Acme Inc.</h1>
      </div>

      <div className="grid gap-4">
        <SignInSocialButton
          provider="github"
          callbackURL={redirectUrl}
          icon={<SiGithub className="size-4" />}
        />
        <SignInSocialButton
          provider="azure"
          callbackURL={redirectUrl}
          icon={<span className="size-4 text-sm font-bold">M</span>}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete signup.tsx**

Delete `apps/web/src/routes/_guest/signup.tsx`. No email signup needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/_guest/
git commit -m "refactor(web): oauth-only login page, remove email signup"
```

---

### Task 7: Update route guards and context

**Files:**

- Modify: `apps/web/src/routes/__root.tsx`
- Modify: `apps/web/src/routes/_auth/route.tsx`
- Modify: `apps/web/src/routes/_guest/route.tsx`
- Modify: `apps/web/src/routes/_auth/app/index.tsx`

- [ ] **Step 1: Update \_\_root.tsx context type**

```typescript
import type { AuthQueryResult } from "@repo/auth/tanstack/queries";
import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/lib/theme-provider";
// ... other imports

interface MyRouterContext {
  queryClient: QueryClient;
  user: AuthQueryResult;
}

// ... rest stays the same
```

Note: The `AuthQueryResult` type now resolves to `User | null` from Supabase. The root component itself stays mostly the same.

- [ ] **Step 2: Update \_auth/route.tsx**

Keep as-is. The `authQueryOptions()` and `$getUser()` are already updated in Task 3. The redirect logic works the same.

- [ ] **Step 3: Update \_guest/route.tsx**

Keep as-is. Same reason — the auth query layer handles the Supabase migration.

- [ ] **Step 4: Update \_auth/app/index.tsx**

Update user property reference. Supabase `User` uses `user_metadata` for name:

```typescript
import { useAuthSuspense } from "@repo/auth/tanstack/hooks";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/app/")({
  component: AppIndex,
});

function AppIndex() {
  const { user } = useAuthSuspense();

  return (
    <div className="flex flex-col items-center gap-3 text-center text-sm">
      <pre className="mb-1 rounded-md border bg-card p-1 text-xs text-card-foreground">
        _auth/app/index.tsx
      </pre>

      <div>
        User from route context:
        <span className="mt-0.5 block font-mono text-xs">
          {user?.user_metadata?.name || user?.email}
        </span>
      </div>

      <div>
        <p>The /app index page, a protected route, since it is under the _auth layout:</p>
        <pre className="mx-auto mt-0.5 block w-fit rounded-md border bg-card p-1 text-xs text-card-foreground">
          _auth/route.tsx
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/routes/
git commit -m "refactor(web): update routes for supabase auth"
```

---

### Task 8: Update router and clean up remaining references

**Files:**

- Modify: `apps/web/src/router.tsx`

- [ ] **Step 1: Check and update router.tsx**

Read `apps/web/src/router.tsx`. If it references `@repo/auth` or better-auth types, update them. Most likely it just sets up TanStack Router with query client and needs no changes.

- [ ] **Step 2: Search for remaining Drizzle/better-auth references**

```bash
grep -r "drizzle\|better-auth\|authClient\.signIn\|authClient\.signUp\|authClient\.signOut" apps/web/src/ packages/
```

If any found, fix them.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up remaining drizzle/better-auth references"
```

---

### Task 9: Install dependencies and verify build

**Files:**

- Modify: `pnpm-lock.yaml` (auto-generated)

- [ ] **Step 1: Remove old dependencies**

```bash
pnpm install
```

This will update lockfile and remove unused packages.

- [ ] **Step 2: Add Supabase dependencies**

```bash
pnpm add @supabase/supabase-js --filter=@repo/db
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
pnpm check
```

Fix any type errors.

- [ ] **Step 4: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: update lockfile for supabase"
```

---

## Environment Variables

After implementation, update `.env` files:

**Remove:**

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

**Add:**

- `SUPABASE_URL=https://your-project.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=your-service-role-key`
- `VITE_SUPABASE_URL=https://your-project.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-anon-key`

**Supabase Auth Config (in Supabase Dashboard):**

- Enable GitHub OAuth provider
- Enable Azure (Microsoft) OAuth provider
- Disable email/password provider (or leave enabled if desired, but UI won't show it)

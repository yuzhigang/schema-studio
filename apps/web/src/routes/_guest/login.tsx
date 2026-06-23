import { SiGithub } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DatabaseZapIcon } from "lucide-react";

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
            <DatabaseZapIcon className="size-6" />
          </div>
          <span className="sr-only">Schema Studio</span>
        </Link>
        <h1 className="text-xl font-bold">Sign in to Schema Studio</h1>
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

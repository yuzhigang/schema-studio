import { Button } from "@repo/ui/components/button";

import { supabaseBrowser } from "#/lib/supabase";

interface SocialLoginButtonProps {
  provider: "github" | "azure";
  icon: React.ReactNode;
  disabled?: boolean;
  callbackURL: string;
}

export function SignInSocialButton(props: SocialLoginButtonProps) {
  const providerLabel = props.provider === "azure" ? "Microsoft" : "GitHub";

  const handleSignIn = async () => {
    const next = props.callbackURL;
    const scopes = props.provider === "github" ? "read:user user:email" : "openid email profile";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabaseBrowser.auth.signInWithOAuth({
      provider: props.provider,
      options: {
        redirectTo,
        scopes,
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

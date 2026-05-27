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
    const next = props.callbackURL.startsWith("http") ? props.callbackURL : props.callbackURL;
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    await supabaseBrowser.auth.signInWithOAuth({
      provider: props.provider,
      options: {
        redirectTo,
        scopes: "read:user user:email",
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

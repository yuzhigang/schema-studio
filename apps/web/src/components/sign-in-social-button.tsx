import { $signInWithOAuth } from "@repo/auth/tanstack/functions";
import { Button } from "@repo/ui/components/button";
import { useState } from "react";

interface SocialLoginButtonProps {
  provider: "github" | "google";
  icon: React.ReactNode;
  disabled?: boolean;
  callbackURL: string;
}

export function SignInSocialButton(props: SocialLoginButtonProps) {
  const providerLabel = props.provider === "google" ? "Google" : "GitHub";
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    const next = props.callbackURL;
    const scopes = props.provider === "github" ? "read:user user:email" : "openid email profile";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    setIsLoading(true);
    try {
      const { url } = await $signInWithOAuth({
        data: { provider: props.provider, redirectTo, scopes },
      });
      if (url) {
        window.location.href = url;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="secondary"
      className="w-full"
      type="button"
      disabled={props.disabled || isLoading}
      onClick={handleSignIn}
    >
      {props.icon}
      Login with {providerLabel}
    </Button>
  );
}

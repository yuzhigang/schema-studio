import { supabaseBrowser } from "@repo/db/browser";
import { Button } from "@repo/ui/components/button";

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

import { $signOut } from "@repo/auth/tanstack/functions";
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
        await $signOut();
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

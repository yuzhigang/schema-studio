import { createSupabaseSSR } from "@repo/db/ssr";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { supabase } = createSupabaseSSR(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setResponseStatus(401);
    throw new Error("Unauthorized");
  }

  return next({ context: { user } });
});

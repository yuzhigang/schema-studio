import { createSupabaseSSR } from "@repo/db/ssr";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  if (!request) {
    return null;
  }
  const { supabase } = createSupabaseSSR(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

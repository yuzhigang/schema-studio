import { supabaseServer } from "@repo/db/server";
import { createServerFn } from "@tanstack/react-start";

export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();
  return user;
});

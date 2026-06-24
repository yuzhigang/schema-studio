import { createSupabaseSSR } from "@repo/db/ssr";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";

function applySSRHeaders(ssrHeaders: Headers) {
  const cookies = ssrHeaders.getSetCookie();
  if (cookies.length > 0) {
    setResponseHeader("Set-Cookie", cookies);
  }
}

function getSSRSupabase() {
  const request = getRequest();
  if (!request) {
    throw new Error("No request available");
  }
  return createSupabaseSSR(request);
}

function isAuthSessionMissingError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "AuthSessionMissingError" || error.message.includes("Auth session missing");
}

export const $getUser = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, headers } = getSSRSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  applySSRHeaders(headers);

  if (error) {
    if (isAuthSessionMissingError(error)) {
      return null;
    }
    throw error;
  }

  return user;
});

const signInSchema = z.object({
  provider: z.enum(["github", "google"]),
  redirectTo: z.string().min(1),
  scopes: z.string().optional(),
});

export const $signInWithOAuth = createServerFn({ method: "POST" })
  .inputValidator(signInSchema)
  .handler(async ({ data }) => {
    const { supabase, headers } = getSSRSupabase();
    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider: data.provider,
      options: {
        redirectTo: data.redirectTo,
        scopes: data.scopes,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    applySSRHeaders(headers);
    return { url: oauthData.url };
  });

const exchangeCodeSchema = z.object({
  code: z.string().min(1),
});

export const $exchangeCodeForSession = createServerFn({ method: "POST" })
  .inputValidator(exchangeCodeSchema)
  .handler(async ({ data }) => {
    const { supabase, headers } = getSSRSupabase();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(data.code);

    if (error) {
      throw error;
    }

    applySSRHeaders(headers);
    return { user: sessionData.user, session: sessionData.session };
  });

export const $signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { supabase, headers } = getSSRSupabase();
  const { error } = await supabase.auth.signOut();

  applySSRHeaders(headers);

  if (error && !isAuthSessionMissingError(error)) {
    throw error;
  }
});

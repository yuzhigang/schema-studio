import { queryOptions } from "@tanstack/react-query";

import { $getUser } from "./functions";

type AuthUserResult = Awaited<ReturnType<typeof $getUser>>;
type GetUser = (options: Parameters<typeof $getUser>[0]) => Promise<AuthUserResult | undefined>;

export const resolveAuthUser = async (getUser: GetUser, signal: AbortSignal) =>
  (await getUser({ signal })) ?? null;

export const authQueryOptions = () =>
  queryOptions({
    queryKey: ["auth"],
    queryFn: ({ signal }) => resolveAuthUser($getUser, signal),
  });

export type AuthQueryResult = AuthUserResult;

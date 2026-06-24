import { createFileRoute, redirect } from "@tanstack/react-router";

import { $fetchMyTeams } from "#/server/team/functions";

export const Route = createFileRoute("/_auth/team/")({
  beforeLoad: async () => {
    const teams = await $fetchMyTeams();
    const firstTeam = teams[0];
    if (!firstTeam) {
      throw redirect({ to: "/login" });
    }
    throw redirect({
      to: "/team/$teamShortCode",
      params: { teamShortCode: firstTeam.shortCode },
    });
  },
});

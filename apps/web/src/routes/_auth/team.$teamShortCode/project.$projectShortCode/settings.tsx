import { createFileRoute } from "@tanstack/react-router";

import { ProjectSettingsPage } from "#/components/schema-studio/project-settings-page";

export const Route = createFileRoute(
  "/_auth/team/$teamShortCode/project/$projectShortCode/settings",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { teamShortCode, projectShortCode } = Route.useParams();
  return <ProjectSettingsPage teamShortCode={teamShortCode} projectShortCode={projectShortCode} />;
}

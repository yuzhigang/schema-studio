import { createFileRoute } from "@tanstack/react-router";

import { SchemaStudioPage } from "#/components/schema-studio/schema-studio-page";

export const Route = createFileRoute(
  "/_auth/team/$teamShortCode/project/$projectShortCode/table/$tableShortCode/",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { teamShortCode, projectShortCode, tableShortCode } = Route.useParams();
  return (
    <SchemaStudioPage
      teamShortCode={teamShortCode}
      projectShortCode={projectShortCode}
      tableShortCode={tableShortCode}
    />
  );
}

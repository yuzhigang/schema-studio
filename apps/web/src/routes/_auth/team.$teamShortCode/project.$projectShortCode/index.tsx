import { createFileRoute } from "@tanstack/react-router";

import { SchemaStudioPage } from "#/components/schema-studio/schema-studio-page";

export const Route = createFileRoute("/_auth/team/$teamShortCode/project/$projectShortCode/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { teamShortCode, projectShortCode } = Route.useParams();
  return <SchemaStudioPage teamShortCode={teamShortCode} projectShortCode={projectShortCode} />;
}

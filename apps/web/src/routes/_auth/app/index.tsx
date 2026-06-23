import { createFileRoute } from "@tanstack/react-router";

import { SchemaStudioPage } from "#/components/schema-studio/schema-studio-page";

export const Route = createFileRoute("/_auth/app/")({
  component: SchemaStudioPage,
});

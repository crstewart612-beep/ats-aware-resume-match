import { createFileRoute } from "@tanstack/react-router";

import { handleRewrite } from "@/lib/resume-ai.server";

export const Route = createFileRoute("/api/rewrite")({
  server: { handlers: { POST: ({ request }) => handleRewrite(request) } },
});

import { createFileRoute } from "@tanstack/react-router";

import { handleAnalyze } from "@/lib/resume-ai.server";

export const Route = createFileRoute("/api/analyze")({
  server: { handlers: { POST: ({ request }) => handleAnalyze(request) } },
});

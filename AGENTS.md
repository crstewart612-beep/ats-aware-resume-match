<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- ATS data in `src/data/ats.ts`, `src/data/toolkit.ts` and `src/lib/ats-rules.server.ts` is generated from the owner's "ATS Resume Toolkit" Google Sheet; regenerate from the sheet rather than hand-editing, so the app stays in sync with the workbook.
- AI calls live only in `src/lib/resume-ai.server.ts`, reached through the `/api/analyze` and `/api/rewrite` server routes that stream NDJSON partial objects; long structured outputs must stream to the browser to avoid hosting timeouts.
- Scoring and rewrite outputs are defined by zod schemas in `src/lib/resume-schemas.ts`, shared by server and UI; change the schema first, then both sides.
- No accounts or storage: resumes and reports live in page state only, so nothing personal is persisted.
- Customers have no accounts: a paid pack is an access code created by the payments webhook, sent by the browser as X-Access-Code; the free report is tracked per browser id (X-Device-Id). Limits are enforced server-side in `src/lib/access.server.ts` so the app never needs sign-in.
- The free "before score" for unpaid visitors is a keyword match computed in the browser (`src/lib/quick-score.ts`, PDFs read with pdfjs-dist) so unpaid use never calls AI.
- AI goes directly to Google Gemini (GEMINI_API_KEY) and payments directly to Paddle's API with the owner's own keys and price ids from env vars, because the app is self-hosted on Netlify outside Lovable's gateways.
- Netlify builds use Nitro's `netlify` preset, switched on in vite.config.ts when NETLIFY is set, so the Lovable sandbox build is unaffected.

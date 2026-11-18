import { createFileRoute } from "@tanstack/react-router";

import { PACK_PRICE_ID, PACK_REPORTS } from "@/lib/entitlements";
import { EventName, verifyWebhook, type PaddleEnv } from "@/lib/paddle.server";

// Public on purpose: the payments provider calls it. Every request's signature is verified
// before anything is written.
async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  const userId = data?.customData?.userId;
  if (typeof userId !== "string" || !/^[0-9a-f-]{36}$/i.test(userId)) {
    console.error("Pack purchase without a valid userId", data?.id);
    return;
  }
  const items: any[] = data?.items ?? [];
  const packs = items.filter((i) => i?.price?.importMeta?.externalId === PACK_PRICE_ID);
  if (!packs.length) {
    console.log("Transaction without a report pack", data?.id);
    return;
  }
  const quantity = packs.reduce((n, i) => n + Number(i?.quantity ?? 1), 0);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("purchases").upsert(
    {
      user_id: userId,
      environment: env,
      paddle_transaction_id: String(data.id),
      price_id: PACK_PRICE_ID,
      reports: PACK_REPORTS * quantity,
    },
    { onConflict: "paddle_transaction_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env: PaddleEnv = new URL(request.url).searchParams.get("env") === "live" ? "live" : "sandbox";
        try {
          const event = await verifyWebhook(request, env);
          if (event.eventType === EventName.TransactionCompleted) {
            await handleTransactionCompleted(event.data, env);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});

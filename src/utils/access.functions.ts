import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { codeStatus, freeStatus, newCode, normalizeCode } from "@/lib/access.server";
import { PACK_REPORTS } from "@/lib/entitlements";
import { gatewayFetch, packPriceId, paymentsEnvFor } from "@/lib/paddle.server";

export const checkAccess = createServerFn({ method: "POST" })
  .inputValidator((d: { code: string | null; device: string }) => d)
  .handler(async ({ data }) => {
    if (data.code) {
      const code = normalizeCode(data.code);
      const s = code ? await codeStatus(code) : null;
      return s ? { kind: "code" as const, code, ...s } : { kind: "invalid" as const };
    }
    if (!/^[a-zA-Z0-9-]{16,64}$/.test(data.device)) return { kind: "invalid" as const };
    return { kind: "free" as const, code: null, ...(await freeStatus(data.device)) };
  });

/**
 * After checkout: the code created for that payment. If the provider's confirmation is slow
 * to arrive, ask the provider directly whether the payment went through and create the code.
 */
export const codeForPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { transactionId: string }) => d)
  .handler(async ({ data }) => {
    if (!/^txn_[a-z0-9]+$/.test(data.transactionId)) return { code: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const find = async () =>
      (await supabaseAdmin.from("access_codes").select("code").eq("paddle_transaction_id", data.transactionId).maybeSingle())
        .data?.code ?? null;
    const existing = await find();
    if (existing) return { code: existing };

    try {
      const env = paymentsEnvFor(getRequest());
      const txn: any = (await (await gatewayFetch(env, `/transactions/${data.transactionId}`)).json())?.data;
      if (!txn || !["completed", "paid"].includes(txn.status)) return { code: null };
      const priceId = packPriceId(env);
      const qty = (txn.items ?? [])
        .filter((i: any) => (i?.price?.id ?? i?.price_id) === priceId)
        .reduce((n: number, i: any) => n + Number(i?.quantity ?? 1), 0);
      if (!qty) return { code: null };
      await supabaseAdmin.from("access_codes").upsert(
        { code: newCode(), environment: env, paddle_transaction_id: txn.id, reports: PACK_REPORTS * qty },
        { onConflict: "paddle_transaction_id", ignoreDuplicates: true },
      );
    } catch (e) {
      console.error("Payment lookup failed", e);
    }
    return { code: await find() };
  });

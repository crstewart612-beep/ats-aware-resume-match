import { createServerFn } from "@tanstack/react-start";

import { codeStatus, freeStatus, normalizeCode } from "@/lib/access.server";

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

/** After checkout: the code created for that payment, once the payment has been confirmed. */
export const codeForPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { transactionId: string }) => d)
  .handler(async ({ data }) => {
    if (!/^txn_[a-z0-9]+$/.test(data.transactionId)) return { code: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("access_codes").select("code").eq("paddle_transaction_id", data.transactionId).maybeSingle();
    return { code: row?.code ?? null };
  });

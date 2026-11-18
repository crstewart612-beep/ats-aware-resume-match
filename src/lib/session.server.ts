// Server-only: who is asking, and what they are allowed to do.
import { createClient } from "@supabase/supabase-js";

import { EMPTY_ENTITLEMENT, type Entitlement, type SubscriptionState } from "@/lib/entitlements";
import type { Database } from "@/integrations/supabase/types";

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** Opaque Supabase keys are not JWTs, so they must travel as `apikey`, never as a bearer. */
function fetchWithApikey(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export type SupabaseUserClient = ReturnType<typeof userClient>;

/** A client that acts as the signed-in customer, so row level security applies to them. */
export function userClient(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Lovable Cloud is not configured");
  return createClient<Database>(url, key, {
    global: {
      fetch: fetchWithApikey(key),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token.split(".").length === 3 ? token : null;
}

export type Session = {
  userId: string;
  entitlement: Entitlement;
  supabase: SupabaseUserClient;
};

/** Verifies the caller's session token and reads what they may do. Null means anonymous. */
export async function readSession(request: Request): Promise<Session | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const supabase = userClient(token);
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  return { userId: String(userId), entitlement: await entitlementOf(supabase), supabase };
}

/** Reads the customer's paid state and this month's usage in one call. */
export async function entitlementOf(supabase: SupabaseUserClient): Promise<Entitlement> {
  const { data, error } = await supabase.rpc("entitlement");
  if (error || !data) return EMPTY_ENTITLEMENT;
  const row = data as Record<string, unknown>;
  return {
    paid: row["paid"] === true,
    scores: Number(row["scores"] ?? 0),
    rewrites: Number(row["rewrites"] ?? 0),
    subscription: (row["subscription"] as SubscriptionState) ?? null,
  };
}

/** Counts one completed use against the customer's month. */
export async function recordUsage(
  supabase: SupabaseUserClient,
  kind: "score" | "rewrite",
): Promise<void> {
  const { error } = await supabase.rpc("record_usage", { p_kind: kind });
  if (error) console.error("Could not record usage", error.message);
}

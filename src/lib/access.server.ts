// Server-only: who is asking (an access code or a browser's free try) and what they may do.
// Customers never sign in. A paid pack is an access code; the one free report is tied to a browser id.
import { FREE_REPORTS } from "@/lib/entitlements";

export type Access = { code: string | null; device: string };
export type Kind = "score" | "rewrite";

const CODE_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const DEVICE_RE = /^[a-zA-Z0-9-]{16,64}$/;

export function normalizeCode(raw: string | null | undefined): string | null {
  const c = (raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
  return CODE_RE.test(c) ? c : null;
}

export function readAccess(request: Request): Access | null {
  const device = request.headers.get("x-device-id") ?? "";
  if (!DEVICE_RE.test(device)) return null;
  return { code: normalizeCode(request.headers.get("x-access-code")), device };
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

export type CodeStatus = { reports: number; scoresLeft: number; rewritesLeft: number };

export async function codeStatus(code: string): Promise<CodeStatus | null> {
  const db = await admin();
  const { data } = await db.from("access_codes").select("reports,scores_used,rewrites_used").eq("code", code).maybeSingle();
  if (!data) return null;
  return {
    reports: data.reports,
    scoresLeft: Math.max(0, data.reports - data.scores_used),
    rewritesLeft: Math.max(0, data.reports - data.rewrites_used),
  };
}

export async function freeStatus(device: string): Promise<CodeStatus> {
  const db = await admin();
  const { data } = await db.from("free_tries").select("scores_used,rewrites_used").eq("device_id", device).maybeSingle();
  return {
    reports: FREE_REPORTS,
    scoresLeft: Math.max(0, FREE_REPORTS - (data?.scores_used ?? 0)),
    rewritesLeft: Math.max(0, FREE_REPORTS - (data?.rewrites_used ?? 0)),
  };
}

/** "unknown_code" when a code was sent but doesn't exist. */
export async function allowed(a: Access, kind: Kind): Promise<"ok" | "used_up" | "unknown_code"> {
  const s = a.code ? await codeStatus(a.code) : await freeStatus(a.device);
  if (!s) return "unknown_code";
  return (kind === "score" ? s.scoresLeft : s.rewritesLeft) > 0 ? "ok" : "used_up";
}

export async function consume(a: Access, kind: Kind): Promise<void> {
  const db = await admin();
  const { error } = await db.rpc("use_access", { p_code: a.code as string, p_device: a.device, p_kind: kind });
  if (error) console.error("Could not record usage", error.message);
}

/** Unambiguous letters and digits (no 0/O, 1/I/L). */
export function newCode(): string {
  const abc = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(bytes, (b) => abc[b % abc.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

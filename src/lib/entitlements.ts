// What a customer may do. ResumeMatch sells one-time report packs; nothing renews.
// Each report includes one rewrite. Only edit the numbers below.

/** No free reports: every report needs a paid pack. */
export const FREE_REPORTS = 0;
/** Reports added by one pack. */
export const PACK_REPORTS = 10;
/** Human-readable price id of the pack in the payments catalog. */
export const PACK_PRICE_ID = "resume_match_pack_10";

export const PLAN_NAME = "ResumeMatch Report Pack";
export const PLAN_PRICE = "$19, one payment, nothing renews";
export const PLAN_BENEFITS = [
  `${PACK_REPORTS} score reports on any hiring system`,
  "A truthful AI rewrite and new score with every report",
  "Word download of each rewritten resume",
  "Reports never expire",
];

export type Entitlement = {
  /** Reports bought across all packs. */
  purchased: number;
  /** Reports used in total. */
  scores: number;
  /** Rewrites used in total. */
  rewrites: number;
};

export const EMPTY_ENTITLEMENT: Entitlement = { purchased: 0, scores: 0, rewrites: 0 };

export function reportsTotal(e: Entitlement): number {
  return FREE_REPORTS + e.purchased;
}

export function hasPurchased(e: Entitlement): boolean {
  return e.purchased > 0;
}

export function scoreAllowed(e: Entitlement): boolean {
  return e.scores < reportsTotal(e);
}

/** One rewrite per report available. */
export function rewriteAllowed(e: Entitlement): boolean {
  return e.rewrites < reportsTotal(e);
}

/** "3 of 11 reports left" style line. */
export function allowanceLine(e: Entitlement, kind: "score" | "rewrite"): string {
  const total = reportsTotal(e);
  const used = kind === "score" ? e.scores : e.rewrites;
  const left = Math.max(0, total - used);
  const noun = kind === "score" ? "report" : "rewrite";
  return `${left} of ${total} ${noun}${total === 1 ? "" : "s"} left`;
}

export function toEntitlement(row: unknown): Entitlement {
  if (!row || typeof row !== "object") return EMPTY_ENTITLEMENT;
  const r = row as Record<string, unknown>;
  return {
    purchased: Number(r["purchased"] ?? 0),
    scores: Number(r["scores"] ?? 0),
    rewrites: Number(r["rewrites"] ?? 0),
  };
}

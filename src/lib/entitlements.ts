// What a customer may do, and what a paying plan unlocks.
// Only edit the numbers below: they are the whole free-tier policy.

/** Score reports a signed-in customer gets each month without paying. */
export const FREE_MONTHLY_SCORES = 3;
/** Rewrites a signed-in customer gets each month without paying. */
export const FREE_MONTHLY_REWRITES = 1;

export const PLAN_NAME = "ResumeMatch Pro";
export const PLAN_PRICE = "$19 per month";
export const PLAN_BENEFITS = [
  "Unlimited score reports",
  "Unlimited AI rewrites",
  "Every hiring system, including the ones still coming",
  "Your saved reports stay available",
];

export type SubscriptionState = {
  status: string;
  plan: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null;

export type Entitlement = {
  paid: boolean;
  scores: number;
  rewrites: number;
  subscription: SubscriptionState;
};

export const EMPTY_ENTITLEMENT: Entitlement = {
  paid: false,
  scores: 0,
  rewrites: 0,
  subscription: null,
};

/** A paying customer is never limited; a free one has monthly scores left. */
export function scoreAllowed(e: Entitlement): boolean {
  return e.paid || e.scores < FREE_MONTHLY_SCORES;
}

/** A paying customer is never limited; a free one has monthly rewrites left. */
export function rewriteAllowed(e: Entitlement): boolean {
  return e.paid || e.rewrites < FREE_MONTHLY_REWRITES;
}

/** "2 of 3 free score reports left this month", or "included in your plan". */
export function allowanceLine(e: Entitlement, kind: "score" | "rewrite"): string {
  if (e.paid) return "Unlimited on your plan";
  const limit = kind === "score" ? FREE_MONTHLY_SCORES : FREE_MONTHLY_REWRITES;
  const used = kind === "score" ? e.scores : e.rewrites;
  const left = Math.max(0, limit - used);
  return `${left} of ${limit} free ${kind === "score" ? "reports" : "rewrites"} left this month`;
}

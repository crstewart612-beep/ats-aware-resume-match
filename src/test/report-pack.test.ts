import { describe, expect, it } from "vitest";
import { allowanceLine, rewriteAllowed, scoreAllowed, EMPTY_ENTITLEMENT } from "@/lib/entitlements";

describe("report pack rules", () => {
  it("gives no free report before paying", () => {
    expect(scoreAllowed(EMPTY_ENTITLEMENT)).toBe(false);
    expect(rewriteAllowed(EMPTY_ENTITLEMENT)).toBe(false);
  });
  it("adds 10 reports per pack ", () => {
    expect(scoreAllowed({ purchased: 10, scores: 9, rewrites: 0 })).toBe(true);
    expect(scoreAllowed({ purchased: 10, scores: 10, rewrites: 0 })).toBe(false);
  });
  it("allows one rewrite per report", () => {
    expect(rewriteAllowed({ purchased: 10, scores: 1, rewrites: 10 })).toBe(false);
    expect(rewriteAllowed({ purchased: 10, scores: 2, rewrites: 1 })).toBe(true);
  });
  it("shows reports left", () => {
    expect(allowanceLine({ purchased: 10, scores: 3, rewrites: 0 }, "score")).toBe("7 of 10 reports left");
  });
});

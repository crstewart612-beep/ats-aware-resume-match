import { describe, expect, it } from "vitest";
import { allowanceLine, rewriteAllowed, scoreAllowed, EMPTY_ENTITLEMENT } from "@/lib/entitlements";

describe("report pack rules", () => {
  it("gives a new customer exactly one free report", () => {
    expect(scoreAllowed(EMPTY_ENTITLEMENT)).toBe(true);
    expect(scoreAllowed({ purchased: 0, scores: 1, rewrites: 0 })).toBe(false);
  });
  it("adds 10 reports per pack on top of the free one", () => {
    expect(scoreAllowed({ purchased: 10, scores: 10, rewrites: 0 })).toBe(true);
    expect(scoreAllowed({ purchased: 10, scores: 11, rewrites: 0 })).toBe(false);
  });
  it("allows one rewrite per report", () => {
    expect(rewriteAllowed({ purchased: 0, scores: 1, rewrites: 1 })).toBe(false);
    expect(rewriteAllowed({ purchased: 10, scores: 2, rewrites: 1 })).toBe(true);
  });
  it("shows reports left", () => {
    expect(allowanceLine({ purchased: 10, scores: 3, rewrites: 0 }, "score")).toBe("8 of 11 reports left");
  });
});

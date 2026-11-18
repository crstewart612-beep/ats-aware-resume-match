import { describe, expect, it } from "vitest";
import { cleanDashes, noDashes } from "@/lib/stream-client";
describe("noDashes", () => {
  it("removes em-dashes from sentences", () => expect(noDashes("Strong fit — apply")).toBe("Strong fit, apply"));
  it("keeps date ranges with a hyphen", () => expect(noDashes("01/2024 – 07/2026")).toBe("01/2024 - 07/2026"));
  it("cleans escaped dashes inside parsed AI output", () =>
    expect(cleanDashes(JSON.parse('{"a":["Worth applying \\u2014 a referral"]}'))).toEqual({ a: ["Worth applying, a referral"] }));
});

import { describe, expect, it } from "vitest";
import { newCode, normalizeCode } from "@/lib/access.server";

describe("access codes", () => {
  it("creates codes in the XXXX-XXXX-XXXX format with no look-alike characters", () => {
    for (let i = 0; i < 50; i++) {
      const c = newCode();
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(c).not.toMatch(/[01OIL]/);
    }
  });
  it("accepts a code typed in lowercase with spaces", () => {
    expect(normalizeCode(" abcd-efgh-jkmn ")).toBe("ABCD-EFGH-JKMN");
    expect(normalizeCode("nope")).toBeNull();
  });
});

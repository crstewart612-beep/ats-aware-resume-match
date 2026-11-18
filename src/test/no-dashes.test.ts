import { describe, expect, it } from "vitest";
import { noDashes } from "@/lib/stream-client";
describe("noDashes", () => {
  it("removes em-dashes from sentences", () => expect(noDashes("Strong fit — apply")).toBe("Strong fit, apply"));
  it("keeps date ranges with a hyphen", () => expect(noDashes("01/2024 – 07/2026")).toBe("01/2024 - 07/2026"));
});

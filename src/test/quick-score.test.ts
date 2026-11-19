import { describe, expect, it } from "vitest";
import { quickScore } from "@/lib/quick-score";

const JD = "We need SQL and Tableau. SQL reporting daily. Tableau dashboards. Stakeholder management. Python scripts. Python automation.";

describe("free before score (no AI)", () => {
  it("counts job terms found in the resume", () => {
    const s = quickScore(JD, "Built Tableau dashboards and SQL reports.");
    expect(s.matched).toEqual(expect.arrayContaining(["sql", "tableau"]));
    expect(s.missing).toContain("python");
    expect(s.percent).toBeGreaterThan(0);
    expect(s.percent).toBeLessThan(100);
  });
  it("gives 0 when nothing matches", () => {
    expect(quickScore(JD, "Gardening and baking").percent).toBe(0);
  });
});

import { describe, expect, it } from "vitest";

import { ATS_SYSTEMS } from "@/data/ats";
import { detectAtsFromUrl } from "@/lib/ats-detect";
import { parseResumeMarkdown } from "@/lib/resume-markdown";

describe("hiring system detection from the Apply link", () => {
  it("recognises Workday links", () => {
    expect(detectAtsFromUrl("https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1")).toBe("workday-recruiting");
  });
  it("recognises Greenhouse links", () => {
    expect(detectAtsFromUrl("https://job-boards.greenhouse.io/acme/jobs/123")).toBe("greenhouse");
  });
  it("recognises Taleo links", () => {
    expect(detectAtsFromUrl("https://acme.taleo.net/careersection/2/jobdetail.ftl")).toBe("oracle-taleo");
  });
  it("returns nothing for an unknown careers site", () => {
    expect(detectAtsFromUrl("https://careers.example.com/jobs/42")).toBeNull();
  });
  it("offers all 17 hiring systems from the workbook", () => {
    expect(ATS_SYSTEMS).toHaveLength(17);
  });
});

describe("rewritten resume layout", () => {
  it("reads name, contact line, headings, roles and bullets", () => {
    const blocks = parseResumeMarkdown(
      "# Jane Doe\n555 | jane@x.com\n## Work Experience\n### Coordinator\n- Ran newsletters",
    );
    expect(blocks.map((b) => b.type)).toEqual(["name", "contact", "heading", "role", "bullet"]);
  });
});

/** Detects the hiring system (ATS) from an Apply link, using the workbook's "Identify the ATS" patterns. */
const PATTERNS: { id: string; re: RegExp }[] = [
  { id: "workday-recruiting", re: /myworkdayjobs\.com|myworkdaysite\.com|\.wd\d+\.myworkday/i },
  { id: "oracle-taleo", re: /taleo\.net/i },
  { id: "oracle-recruiting-cloud", re: /oraclecloud\.com\/hcmui|candidateexperience/i },
  { id: "sap-successfactors", re: /successfactors\.(com|eu)|jobs\.sap\.|career\d*\.sapsf/i },
  { id: "icims", re: /icims\.com/i },
  { id: "greenhouse", re: /greenhouse\.io/i },
  { id: "lever", re: /lever\.co\b/i },
  { id: "smartrecruiters", re: /smartrecruiters\.com/i },
  { id: "jobvite", re: /jobvite\.com/i },
  { id: "ashby", re: /ashbyhq\.com/i },
  { id: "bamboohr", re: /bamboohr\.com/i },
  { id: "workable", re: /workable\.com/i },
  { id: "jazzhr", re: /applytojob\.com|jazzhr/i },
  { id: "breezy-hr", re: /breezy\.hr/i },
  { id: "zoho-recruit", re: /zohorecruit\./i },
  { id: "avature", re: /avature\.net/i },
  { id: "bullhorn", re: /bullhorn/i },
];

export function detectAtsFromUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  return PATTERNS.find((p) => p.re.test(value))?.id ?? null;
}

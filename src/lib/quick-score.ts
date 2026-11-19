// Free "before" score worked out in the browser with no AI, so unpaid visitors cost the owner nothing.
// It compares the job description's most repeated terms with the resume's words.
import type { ResumeInput } from "@/lib/resume-schemas";

const STOP = new Set(
  `a about above across after again all also am an and any are as at be because been being below between both but by can could did do does doing during each either etc ever every few for from further get gets had has have having he her here hers him his how i if in into is it its itself just least less like make makes may me more most much must my no nor not now of off on once one only or other our ours out over own per please plus role same shall she should so some such than that the their them then there these they this those through to too under until up upon us very via was we well were what when where which while who whom why will with within without would yes yet you your yours
  sign off ability able apply applicant applicants based benefits candidate candidates company work working team teams job position responsibilities responsibility requirements required requirement preferred qualifications qualification including include includes new using use used strong excellent good great years year experience experienced knowledge skills skill time opportunity opportunities provide providing ensure support within across other others related relevant equal employer employment status include duties duty level day days help helping need needs looking join environment etc ideal must plus least minimum high highly various key across`.split(/\s+/),
);

function stem(w: string): string {
  return w.replace(/(ing|ed|es|s)$/u, "").replace(/(.)\1$/u, "$1");
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/[\s/-]+/)
    .map((w) => w.replace(/^[.]+|[.]+$/g, ""))
    .filter(Boolean);
}

export type QuickScore = { percent: number; matched: string[]; missing: string[] };

/** Top job terms (single words and two-word phrases), most repeated first. */
export function jobTerms(jd: string, limit = 24): string[] {
  const w = words(jd);
  const counts = new Map<string, number>();
  const add = (t: string, n = 1) => counts.set(t, (counts.get(t) ?? 0) + n);
  for (let i = 0; i < w.length; i++) {
    const a = w[i] ?? "";
    const keepA = !STOP.has(a) && (a.length >= 3 || /[+#]/.test(a)) && !/^\d+$/.test(a);
    if (keepA) add(a);
    const b = w[i + 1];
    if (keepA && b && !STOP.has(b) && b.length >= 3 && !/^\d+$/.test(b)) add(`${a} ${b}`, 1.5);
  }
  // A phrase only counts when it repeats; single words win ties.
  const ranked = [...counts.entries()]
    .filter(([t, n]) => (t.includes(" ") ? n >= 3 : true))
    .sort((x, y) => y[1] - x[1] || x[0].length - y[0].length);
  const out: string[] = [];
  for (const [t] of ranked) {
    if (out.some((o) => o.includes(t) || t.includes(o))) continue;
    out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}

export function quickScore(jd: string, resumeText: string): QuickScore {
  const terms = jobTerms(jd);
  const have = new Set(words(resumeText).map(stem));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const t of terms) {
    const ok = t.split(" ").every((p) => have.has(stem(p)));
    (ok ? matched : missing).push(t);
  }
  const percent = terms.length ? Math.round((matched.length / terms.length) * 100) : 0;
  return { percent, matched, missing };
}

/** Plain text of the resume. PDFs are read in the browser. */
export async function resumeText(r: ResumeInput): Promise<string> {
  if (r.kind !== "pdf") return r.text;
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const bin = atob(r.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const parts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const c = await page.getTextContent();
    parts.push(c.items.map((i) => ("str" in i ? i.str : "")).join(" "));
  }
  return parts.join("\n");
}

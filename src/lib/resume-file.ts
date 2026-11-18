import type { ResumeInput } from "@/lib/resume-schemas";

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Reads an attached resume in the browser: PDFs are sent as-is, Word files are converted to text. */
export async function readResumeFile(file: File): Promise<ResumeInput> {
  if (file.size === 0) throw new Error("That file looks empty.");
  if (file.size > MAX_RESUME_BYTES) throw new Error("Please use a file under 5 MB.");
  const name = file.name;
  const lower = name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
    return { kind: "pdf", name, size: file.size, base64: toBase64(buffer) };
  }
  if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const [{ value: text }, { value: html }] = await Promise.all([
      mammoth.extractRawText({ arrayBuffer: buffer }),
      mammoth.convertToHtml(
        { arrayBuffer: buffer },
        { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) },
      ),
    ]);
    const clean = text.replace(/\n{3,}/g, "\n\n").trim();
    if (clean.length < 30) throw new Error("We couldn't find text in that Word file.");
    return {
      kind: "docx",
      name,
      size: file.size,
      text: clean,
      hasTables: /<table/i.test(html),
      hasImages: /<img/i.test(html),
    };
  }
  if (lower.endsWith(".doc")) throw new Error("Older .doc files aren't supported. Save it as .docx or PDF.");
  throw new Error("Please attach a PDF or Word (.docx) file.");
}

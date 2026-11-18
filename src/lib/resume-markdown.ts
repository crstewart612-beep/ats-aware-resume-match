/** Minimal parser for the resume markdown the AI returns; shared by the preview and the Word export. */
export type ResumeBlock =
  | { type: "name"; text: string }
  | { type: "contact"; text: string }
  | { type: "heading"; text: string }
  | { type: "role"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string };

export function parseResumeMarkdown(md: string): ResumeBlock[] {
  const blocks: ResumeBlock[] = [];
  let sawName = false;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("### ")) blocks.push({ type: "role", text: line.slice(4).trim() });
    else if (line.startsWith("## ")) blocks.push({ type: "heading", text: line.slice(3).trim() });
    else if (line.startsWith("# ")) {
      blocks.push({ type: "name", text: line.slice(2).trim() });
      sawName = true;
    } else if (/^[-*•]\s+/.test(line)) blocks.push({ type: "bullet", text: line.replace(/^[-*•]\s+/, "") });
    else if (sawName && blocks.length === 1) blocks.push({ type: "contact", text: line });
    else blocks.push({ type: "paragraph", text: line });
  }
  return blocks;
}

/** Splits **bold** runs so both renderers can style them. */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}

export function stripMarkdown(md: string): string {
  return md
    .split(/\r?\n/)
    .map((l) => l.replace(/^#{1,3}\s+/, "").replace(/^[-*]\s+/, "• ").replace(/\*\*/g, ""))
    .join("\n");
}

import { parseResumeMarkdown, splitBold } from "@/lib/resume-markdown";

/** Builds a single-column, ATS-friendly Word file from the rewritten resume. Browser only. */
export async function downloadResumeDocx(markdown: string, fileName: string) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("docx");
  const blocks = parseResumeMarkdown(markdown);
  const runs = (text: string, size = 21) =>
    splitBold(text).map((p) => new TextRun({ text: p.text, bold: p.bold, size, font: "Calibri" }));

  const children = blocks.map((b) => {
    switch (b.type) {
      case "name":
        return new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: b.text, bold: true, size: 34, font: "Calibri" })],
        });
      case "contact":
        return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: runs(b.text, 20) });
      case "heading":
        return new Paragraph({
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 2 } },
          children: [new TextRun({ text: b.text.toUpperCase(), bold: true, size: 23, font: "Calibri" })],
        });
      case "role":
        return new Paragraph({ spacing: { before: 140 }, children: runs(`**${b.text}**`, 22) });
      case "bullet":
        return new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: runs(b.text) });
      default:
        return new Paragraph({ spacing: { after: 60 }, children: runs(b.text) });
    }
  });

  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

import { FileText, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { readResumeFile } from "@/lib/resume-file";
import type { ResumeInput } from "@/lib/resume-schemas";
import { cn } from "@/lib/utils";

export function ResumeDrop({
  value,
  onChange,
}: {
  value: ResumeInput | null;
  onChange: (r: ResumeInput | null) => void;
}) {
  const [mode, setMode] = useState<"file" | "text">(value?.kind === "text" ? "text" : "file");
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await readResumeFile(file));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        /module script|dynamically imported module|Load failed|Failed to fetch/i.test(msg)
          ? "We couldn't open that file just now. Please try again."
          : msg || "We couldn't read that file.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full bg-muted p-1 text-sm font-semibold" role="tablist">
        {(["file", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              if (value && (m === "text") !== (value.kind === "text")) onChange(null);
            }}
            className={cn(
              "rounded-full px-4 py-1.5 transition-all",
              mode === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
            )}
          >
            {m === "file" ? "Attach a file" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        value && value.kind !== "text" ? (
          <div className="flex items-center gap-3 rounded-2xl border bg-primary-soft/60 p-4">
            <span className="grid size-11 place-items-center rounded-xl bg-card text-primary shadow-soft">
              <FileText className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{value.name}</p>
              <p className="text-xs text-muted-foreground">
                {value.kind === "pdf" ? "PDF" : "Word document"} · {(value.size / 1024).toFixed(0)} KB
                {value.size > 2 * 1024 * 1024 && " · over 2 MB, some systems may reject it"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-card"
              aria-label="Remove file"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void accept(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-muted/50 px-6 py-10 text-center transition-all hover:border-primary/50 hover:bg-primary-soft/40",
              drag && "border-primary bg-primary-soft/60",
            )}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-card text-primary shadow-soft">
              <UploadCloud className={cn("size-6", busy && "animate-pulse")} />
            </span>
            <span className="font-semibold">{busy ? "Reading your resume…" : "Drop your resume here or click to browse"}</span>
            <span className="text-sm text-muted-foreground">PDF or Word (.docx), up to 5 MB</span>
          </button>
        )
      ) : (
        <Textarea
          value={value?.kind === "text" ? value.text : ""}
          onChange={(e) =>
            onChange(e.target.value.trim() ? { kind: "text", name: "Pasted resume", text: e.target.value } : null)
          }
          placeholder="Paste your full resume here…"
          className="min-h-56 rounded-2xl bg-card p-4 text-sm leading-relaxed"
          aria-label="Resume text"
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

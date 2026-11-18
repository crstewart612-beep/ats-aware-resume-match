import { Check, Link2, Search, Sparkle } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { ALL_ATS, GENERIC_ATS, findAts } from "@/data/ats";
import { detectAtsFromUrl } from "@/lib/ats-detect";
import { cn } from "@/lib/utils";

export function AtsPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [link, setLink] = useState("");
  const [query, setQuery] = useState("");
  const detected = useMemo(() => detectAtsFromUrl(link), [link]);
  const filtered = ALL_ATS.filter(
    (a) => !query || `${a.name} ${a.vendor}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = value ? findAts(value) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-dashed bg-muted/60 p-4">
        <label htmlFor="apply-link" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Link2 className="size-4 text-primary" /> Not sure? Paste the job's Apply link
        </label>
        <Input
          id="apply-link"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            const id = detectAtsFromUrl(e.target.value);
            if (id) onChange(id);
          }}
          placeholder="e.g. acme.wd5.myworkdayjobs.com/careers/job/…"
          className="h-11 rounded-xl bg-card"
        />
        {link.trim() && (
          <p className={cn("mt-2 text-sm", detected ? "text-met" : "text-muted-foreground")}>
            {detected
              ? `Looks like ${findAts(detected)?.name}. We've selected it for you.`
              : "We couldn't recognise that link. Look for a “Powered by…” line on the application page, or choose “Not sure”."}
          </p>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hiring systems"
          className="h-11 rounded-xl pl-10"
          aria-label="Search hiring systems"
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {filtered.map((a) => {
          const active = value === a.id;
          const generic = a.id === GENERIC_ATS.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onChange(a.id)}
              aria-pressed={active}
              className={cn(
                "group relative flex flex-col items-start rounded-2xl border bg-card px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft",
                active && "border-primary bg-primary-soft shadow-soft",
                generic && !active && "border-dashed",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold">{a.name}</span>
                {active ? (
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                ) : generic ? (
                  <Sparkle className="size-4 text-muted-foreground" />
                ) : null}
              </span>
              <span className="text-xs text-muted-foreground">{a.vendor}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div key={selected.id} className="animate-rise grid gap-3 rounded-2xl bg-secondary/60 p-4 text-sm sm:grid-cols-2">
          <Fact label="How you're graded" value={selected.scale} />
          <Fact label="How strict it reads files" value={selected.strictness} />
          <Fact label="What it looks for" value={selected.looksFor} />
          <Fact label="Formatting tip" value={selected.formattingTips} />
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-secondary-foreground uppercase">{label}</p>
      <p className="mt-1 leading-relaxed text-foreground/85">{value}</p>
    </div>
  );
}

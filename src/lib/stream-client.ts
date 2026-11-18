import type { StreamEvent } from "@/lib/resume-schemas";
import { accessHeaders } from "@/lib/access-client";

export class StreamRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    /** "plan_required" means offer a report pack; "bad_code" means the access code is wrong. */
    public code?: string,
  ) {
    super(message);
  }
}

/** POSTs JSON and reads newline-delimited JSON events, calling onPartial as the AI writes. */
export async function postNdjson<T>(
  url: string,
  body: unknown,
  onPartial: (data: T) => void,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...accessHeaders(),
    },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });
  if (!res.ok || !res.body) {
    let message = "Something went wrong. Please try again.";
    let code: string | undefined;
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
      if (json?.code) code = json.code;
    } catch {
      /* keep default */
    }
    throw new StreamRequestError(res.status, message, code);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: T | null = null;

  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = cleanDashes(JSON.parse(line)) as StreamEvent<T> | { type: "ping" };
    if (event.type === "partial") onPartial(event.data);
    else if (event.type === "final") final = event.data;
    else if (event.type === "error") throw new StreamRequestError(event.status, event.message, event.code);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      handle(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
  }
  handle(buffer);
  if (!final) throw new StreamRequestError(502, "The answer was cut off. Please try again.");
  return final;
}

/** Removes em/en dashes from AI text (house style), keeping date ranges readable. */
export function noDashes(text: string): string {
  return text
    .replace(/(\d)\s*[\u2012-\u2015\u2212]\s*(\d|Present|Current)/g, "$1 - $2")
    .replace(/\s*[\u2012-\u2015]\s*/g, ", ");
}

/** Applies noDashes to every string in parsed AI output (escaped \u2014 sequences survive raw-line cleanup). */
export function cleanDashes<T>(value: T): T {
  if (typeof value === "string") return noDashes(value) as T;
  if (Array.isArray(value)) return value.map(cleanDashes) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanDashes(v)])) as T;
  return value;
}

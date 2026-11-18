import type { StreamEvent } from "@/lib/resume-schemas";

export class StreamRequestError extends Error {
  constructor(
    public status: number,
    message: string,
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });
  if (!res.ok || !res.body) {
    let message = "Something went wrong. Please try again.";
    try {
      const json = await res.json();
      if (json?.message) message = json.message;
    } catch {
      /* keep default */
    }
    throw new StreamRequestError(res.status, message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: T | null = null;

  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as StreamEvent<T> | { type: "ping" };
    if (event.type === "partial") onPartial(event.data);
    else if (event.type === "final") final = event.data;
    else if (event.type === "error") throw new StreamRequestError(event.status, event.message);
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

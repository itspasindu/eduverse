import { parseApiDetail } from "@/lib/moderation-error";

export type TutorMode = "standard" | "simple" | "meme";

export type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; mode?: string; model?: string };

export async function streamTutor(
  question: string,
  mode: TutorMode,
  onDelta: (chunk: string) => void,
  token?: string | null,
): Promise<void> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/tutor", {
    method: "POST",
    headers,
    body: JSON.stringify({ question, mode }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiDetail(err.detail) || "Tutor request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as StreamEvent;
      if (event.type === "delta") {
        onDelta(event.content);
      }
    }
  }
}

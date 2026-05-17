import { getAccessToken } from "@/lib/auth";
import { parseApiDetail } from "@/lib/moderation-error";

export type TutorMode = "standard" | "simple" | "meme";

export type AgentStep = {
  step_type: string;
  tool_name?: string | null;
  input?: Record<string, unknown> | null;
  output?: string | null;
};

export type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "step"; step: AgentStep }
  | { type: "done"; mode?: string; model?: string; steps?: AgentStep[] };

export async function streamTutor(
  question: string,
  mode: TutorMode,
  onDelta: (chunk: string) => void,
  token?: string | null,
  options?: {
    characterId?: string | null;
    onStep?: (step: AgentStep) => void;
  },
): Promise<AgentStep[]> {
  const authToken = token ?? (await getAccessToken());
  if (!authToken) {
    throw new Error("Sign in to use the AI tutor.");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  };

  const res = await fetch("/api/tutor", {
    method: "POST",
    headers,
    body: JSON.stringify({
      question,
      mode,
      character_id: options?.characterId ?? null,
    }),
  });

  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiDetail(err.detail) || "Tutor request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const steps: AgentStep[] = [];

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
      } else if (event.type === "step") {
        steps.push(event.step);
        options?.onStep?.(event.step);
      } else if (event.type === "done" && event.steps) {
        for (const s of event.steps) {
          if (!steps.some((x) => x.tool_name === s.tool_name && x.output === s.output)) {
            steps.push(s);
          }
        }
      }
    }
  }

  return steps;
}

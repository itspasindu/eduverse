"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { streamTutor, type TutorMode } from "@/lib/tutor";

type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  streaming?: boolean;
};

const MODE_OPTIONS: { value: TutorMode; label: string; description: string }[] = [
  { value: "standard", label: "Standard", description: "Balanced explanations" },
  { value: "simple", label: "Explain Simply", description: "Easy words & analogies" },
  { value: "meme", label: "Explain as Meme", description: "Fun, meme-style teaching" },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function TutorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your EduVerse tutor. Ask anything — pick how you'd like me to explain it below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<TutorMode>("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const question = input.trim();
      if (!question || isLoading) return;

      setError(null);
      setInput("");
      setIsLoading(true);

      const userMsg: Message = { id: uid(), role: "user", content: question };
      const assistantId = uid();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      try {
        const token = await getAccessToken();

        await streamTutor(
          question,
          mode,
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk }
                  : m,
              ),
            );
          },
          token,
        );

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, mode],
  );

  return (
    <div className="flex h-[min(720px,calc(100vh-8rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-indigo-500/20 bg-white/90 shadow-xl shadow-indigo-500/10 backdrop-blur dark:bg-zinc-900/90">
      <header className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          AI Tutor Chat
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Ask a question and get a streamed response in real time.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isLoading}
              onClick={() => setMode(opt.value)}
              title={opt.description}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mode === opt.value
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              } disabled:opacity-50`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p
          role="alert"
          className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={sendMessage}
        className="border-t border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Ask your tutor anything…"
            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`chat-bubble max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-md bg-indigo-600 text-white"
            : "rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        } ${message.streaming ? "chat-bubble-streaming" : ""}`}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content}
          {message.streaming && (
            <span className="chat-cursor ml-0.5 inline-block h-4 w-0.5 align-middle bg-indigo-500" />
          )}
        </p>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi, type ChatMessage } from "@/lib/api-client";
import { Send, Loader2, ArrowLeft, User, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

function Message({
  msg,
}: {
  msg: ChatMessage & {
    sources?: { id: string; content: string; similarity: number }[];
  };
}) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-blue-600" : "bg-gray-200"}`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Zap size={14} className="text-gray-600" />
        )}
      </div>
      <div
        className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}
      >
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${isUser ? "bg-blue-600 text-white" : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-200"}`}
        >
          {msg.content}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="space-y-1">
            {msg.sources.slice(0, 3).map((src) => (
              <div
                key={src.id}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-500"
              >
                <span className="font-medium text-gray-600">
                  Source ({Math.round(src.similarity * 100)}% match):
                </span>{" "}
                {src.content.slice(0, 150)}…
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SessionPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;
  const router = useRouter();
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { data: session, isLoading } = useQuery({
    queryKey: ["chat-session", sessionId],
    queryFn: () => chatApi.getSession(sessionId),
  });

  const send = useMutation({
    mutationFn: (content: string) => chatApi.sendMessage(sessionId, content),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["chat-session", sessionId] }),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || send.isPending) return;
    setInput("");
    send.mutate(text);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-4">
        <button
          onClick={() => router.push("/chat")}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-semibold text-gray-800">
          {session?.title ?? "Chat"}
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : session?.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <Zap size={36} className="text-blue-400" />
            <p className="text-sm font-medium text-gray-600">
              Ask anything about your documents
            </p>
            <p className="text-xs text-gray-400">
              The AI will search across all indexed files.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {session?.messages.map((msg) => (
              <Message key={msg.id} msg={msg} />
            ))}
            {send.isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                  <Zap size={14} className="text-gray-600" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-gray-200 bg-white px-6 py-4"
      >
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents…"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || send.isPending}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api-client";
import { MessageSquare, Plus, Loader2 } from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: chatApi.listSessions,
  });

  const create = useMutation({
    mutationFn: chatApi.createSession,
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
      router.push(`/chat/${session.id}`);
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Chat</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Ask questions about your documents.
          </p>
        </div>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Plus size={16} /> New chat
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center">
          <MessageSquare size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">
            No conversations yet. Start a new chat.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`/chat/${s.id}`)}
              className="flex w-full items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm hover:border-blue-200 hover:bg-blue-50"
            >
              <MessageSquare size={18} className="shrink-0 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {s.title ?? "Untitled chat"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {s._count?.messages ?? 0} messages ·{" "}
                  {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

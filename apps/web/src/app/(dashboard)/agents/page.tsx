"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  agentsApi,
  type Agent,
  type AgentDetail,
  type AgentJob,
} from "@/lib/api-client";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive,
  KeyRound,
  Loader2,
  Monitor,
  Plus,
  Server,
  ShieldCheck,
  Trash2,
  Copy,
  ChevronRight,
  Activity,
  ToggleLeft,
  ToggleRight,
  FolderOpen,
  X,
} from "lucide-react";

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-500",
  offline: "bg-gray-300",
};

const JOB_BADGE: Record<string, string> = {
  queued: "bg-gray-100 text-gray-600",
  assigned: "bg-blue-100 text-blue-700",
  running: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-600",
  canceled: "bg-gray-100 text-gray-400",
};

function dateLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function formatBytes(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (n === 0) return "0 B";
  if (n >= 1024 * 1024 * 1024)
    return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

function mbToBytes(mb: number) {
  return mb * 1024 * 1024;
}

function bytesToMb(bytes: string | null | undefined) {
  return Math.round(Number(bytes ?? 52428800) / (1024 * 1024));
}

// ── Agent list card ──────────────────────────────────────────────────────────

function AgentCard({
  agent,
  selected,
  onClick,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-blue-300 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[agent.status] ?? "bg-gray-300"}`}
          />
          <span className="truncate text-sm font-semibold text-gray-900">
            {agent.name}
          </span>
        </div>
        <ChevronRight size={14} className="shrink-0 text-gray-400" />
      </div>
      <div className="mt-1.5 ml-4.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400">
        {agent.machineName && <span>{agent.machineName}</span>}
        {agent.os && <span>{agent.os}</span>}
        {agent.version && <span>v{agent.version}</span>}
      </div>
      <div className="mt-1 ml-4.5 text-xs text-gray-400">
        Last seen: {dateLabel(agent.lastSeenAt)}
      </div>
      {agent._count && (
        <div className="mt-1 ml-4.5 flex gap-3 text-xs text-gray-400">
          <span>{agent._count.sources} sources</span>
          <span>{agent._count.downloadJobs} jobs</span>
        </div>
      )}
    </button>
  );
}

// ── Job row ──────────────────────────────────────────────────────────────────

function JobRow({ job }: { job: AgentJob }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-xs font-medium text-gray-800">
            {job.source?.name ?? "Unknown source"}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${JOB_BADGE[job.status] ?? JOB_BADGE.queued}`}
          >
            {job.status}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-400">
          <span>{dateLabel(job.createdAt)}</span>
          {job.bytesDownloaded && Number(job.bytesDownloaded) > 0 && (
            <span>{formatBytes(job.bytesDownloaded)}</span>
          )}
          {job.durationMs && <span>{(job.durationMs / 1000).toFixed(1)}s</span>}
        </div>
        {job.errorMessage && (
          <p className="mt-1 text-xs text-red-500 line-clamp-2">
            {job.errorMessage}
          </p>
        )}
      </div>
      {job.status === "completed" ? (
        <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-500" />
      ) : job.status === "failed" ? (
        <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
      ) : job.status === "running" ? (
        <Loader2
          size={14}
          className="mt-0.5 shrink-0 animate-spin text-yellow-500"
        />
      ) : (
        <Clock size={14} className="mt-0.5 shrink-0 text-gray-300" />
      )}
    </div>
  );
}

// ── Permissions panel ────────────────────────────────────────────────────────

function PermissionsPanel({
  agent,
  onSaved,
}: {
  agent: AgentDetail;
  onSaved: () => void;
}) {
  const [maxFileMb, setMaxFileMb] = useState(bytesToMb(agent.maxFileBytes));
  const [allowLocal, setAllowLocal] = useState(agent.allowLocalFiles);
  const [roots, setRoots] = useState<string[]>(agent.allowedLocalRoots);
  const [newRoot, setNewRoot] = useState("");
  const [saved, setSaved] = useState(false);

  const update = useMutation({
    mutationFn: () =>
      agentsApi.update(agent.id, {
        maxFileBytes: mbToBytes(maxFileMb),
        allowLocalFiles: allowLocal,
        allowedLocalRoots: roots,
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    },
  });

  function addRoot() {
    const v = newRoot.trim();
    if (v && !roots.includes(v)) {
      setRoots([...roots, v]);
      setNewRoot("");
    }
  }

  function removeRoot(r: string) {
    setRoots(roots.filter((x) => x !== r));
  }

  return (
    <div className="space-y-4">
      {/* Max file size */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Max file size (MB)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={1024}
            value={maxFileMb}
            onChange={(e) => setMaxFileMb(Number(e.target.value))}
            className="w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <span className="text-xs text-gray-400">
            = {formatBytes(mbToBytes(maxFileMb))}
          </span>
        </div>
      </div>

      {/* Allow local files */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">
          Allow local file access
        </label>
        <button
          onClick={() => setAllowLocal(!allowLocal)}
          className="flex items-center gap-2 text-sm"
        >
          {allowLocal ? (
            <ToggleRight size={22} className="text-blue-600" />
          ) : (
            <ToggleLeft size={22} className="text-gray-400" />
          )}
          <span className={allowLocal ? "text-blue-700" : "text-gray-500"}>
            {allowLocal ? "Enabled" : "Disabled"}
          </span>
        </button>
        <p className="mt-1 text-xs text-gray-400">
          When enabled, agent can collect from local filesystem paths.
        </p>
      </div>

      {/* Allowed roots */}
      {allowLocal && (
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Allowed local roots
          </label>
          <div className="space-y-1.5">
            {roots.map((r) => (
              <div
                key={r}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5"
              >
                <FolderOpen size={13} className="shrink-0 text-gray-400" />
                <span className="flex-1 truncate text-xs font-mono text-gray-700">
                  {r}
                </span>
                <button
                  onClick={() => removeRoot(r)}
                  className="shrink-0 text-gray-400 hover:text-red-500"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                value={newRoot}
                onChange={(e) => setNewRoot(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRoot()}
                placeholder="/home/user/documents"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                onClick={addRoot}
                disabled={!newRoot.trim()}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-gray-600 hover:border-blue-300 hover:bg-blue-50 disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => update.mutate()}
        disabled={update.isPending}
        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {update.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : saved ? (
          <CheckCircle size={14} />
        ) : (
          <ShieldCheck size={14} />
        )}
        {saved ? "Saved!" : "Save permissions"}
      </button>
    </div>
  );
}

// ── Agent detail panel ───────────────────────────────────────────────────────

function AgentDetailPanel({
  agentId,
  onDeleted,
}: {
  agentId: string;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"activity" | "permissions" | "sources">(
    "activity",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: agent, isLoading } = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => agentsApi.get(agentId),
    refetchInterval: 5000,
  });

  const deleteAgent = useMutation({
    mutationFn: () => agentsApi.delete(agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      onDeleted();
    },
  });

  if (isLoading || !agent) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[agent.status] ?? "bg-gray-300"}`}
            />
            <h2 className="text-base font-bold text-gray-900">{agent.name}</h2>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-400">
            {agent.machineName && (
              <span className="flex items-center gap-1">
                <Monitor size={11} /> {agent.machineName}
              </span>
            )}
            {agent.os && (
              <span className="flex items-center gap-1">
                <HardDrive size={11} /> {agent.os}
              </span>
            )}
            {agent.version && <span>v{agent.version}</span>}
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            Last seen: {dateLabel(agent.lastSeenAt)} · Created{" "}
            {dateLabel(agent.createdAt)}
          </p>
        </div>

        {confirmDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-red-600">Revoke token?</span>
            <button
              onClick={() => deleteAgent.mutate()}
              disabled={deleteAgent.isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              {deleteAgent.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                "Confirm"
              )}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            title="Revoke agent"
            className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["activity", "permissions", "sources"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {t}
            {t === "activity" && agent._count && (
              <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {agent._count.downloadJobs}
              </span>
            )}
            {t === "sources" && agent._count && (
              <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                {agent._count.sources}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "activity" && (
        <div className="space-y-2">
          {agent.downloadJobs.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No jobs yet.
            </div>
          ) : (
            agent.downloadJobs.map((job) => <JobRow key={job.id} job={job} />)
          )}
        </div>
      )}

      {tab === "permissions" && (
        <PermissionsPanel
          agent={agent}
          onSaved={() => qc.invalidateQueries({ queryKey: ["agent", agentId] })}
        />
      )}

      {tab === "sources" && (
        <div className="space-y-2">
          {agent.sources.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              No sources assigned to this agent.
            </div>
          ) : (
            agent.sources.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">
                    {s.name}
                  </p>
                  <p className="text-xs text-gray-400">{s.type}</p>
                </div>
                {!s.enabled && (
                  <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                    disabled
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [commandCopied, setCommandCopied] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: agentsApi.list,
    refetchInterval: 10000,
  });

  const createAgent = useMutation({
    mutationFn: () => agentsApi.create({ name: agentName }),
    onSuccess: (agent) => {
      setCreatedToken(agent.token);
      setAgentName("");
      setSelectedId(agent.id);
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const onlineCount = agents.filter((a) => a.status === "online").length;

  return (
    <div className="space-y-6 p-8">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Agents</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Manage agent tokens, monitor activity, and control permissions.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Server size={16} className="mb-2 text-blue-600" />
          <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
          <p className="text-xs text-gray-500">registered agents</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Activity size={16} className="mb-2 text-green-600" />
          <p className="text-2xl font-bold text-gray-900">{onlineCount}</p>
          <p className="text-xs text-gray-500">online now</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <ShieldCheck size={16} className="mb-2 text-purple-600" />
          <p className="text-2xl font-bold text-gray-900">
            {agents.filter((a) => a.allowLocalFiles).length}
          </p>
          <p className="text-xs text-gray-500">with local access</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        {/* Left: agent list + create form */}
        <div className="space-y-4">
          {/* Create agent */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              New agent
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (agentName.trim()) createAgent.mutate();
              }}
              className="flex gap-2"
            >
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Agent name"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!agentName.trim() || createAgent.isPending}
                title="Create agent token"
                className="rounded-lg bg-gray-900 p-2 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {createAgent.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <KeyRound size={16} />
                )}
              </button>
            </form>

            {createdToken && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-800">
                  <ShieldCheck size={13} /> Token created — run these commands
                </div>
                <pre className="overflow-x-auto rounded bg-white/70 p-2 text-xs text-green-900">
                  <span className="block">
                    kget-agent login --token {createdToken}
                  </span>
                  <span className="block">kget-agent start</span>
                </pre>
                <button
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(
                        `kget-agent login --token ${createdToken}\nkget-agent start`,
                      )
                      .then(() => {
                        setCommandCopied(true);
                        setTimeout(() => setCommandCopied(false), 2000);
                      });
                  }}
                  className="mt-2 flex items-center gap-1 text-xs text-green-700 hover:text-green-900"
                >
                  <Copy size={11} />
                  {commandCopied ? "Copied!" : "Copy commands"}
                </button>
              </div>
            )}
          </div>

          {/* Agent list */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-300" />
              </div>
            ) : agents.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No agents yet. Create one above.
              </div>
            ) : (
              agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedId === agent.id}
                  onClick={() =>
                    setSelectedId(selectedId === agent.id ? null : agent.id)
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {selectedId ? (
            <AgentDetailPanel
              key={selectedId}
              agentId={selectedId}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-gray-300">
              <Server size={32} />
              <p className="text-sm">Select an agent to see details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

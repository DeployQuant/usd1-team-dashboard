"use client";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  "OPEN": { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
  "IN PROGRESS": { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-400" },
  "IN FLIGHT": { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-400" },
  "PLANNED": { bg: "bg-indigo-500/10", text: "text-indigo-400", dot: "bg-indigo-400" },
  "REVIEW": { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
  "AUDIT-GATED": { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  "COMPLETED": { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  "DONE": { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  "BLOCKED": { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  "PENDING AUDIT": { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig["OPEN"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}

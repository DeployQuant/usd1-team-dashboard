"use client";

import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";

interface DeptDep {
  depends_on_team_slug: string;
  team_name: string;
  note: string;
}

interface Task {
  id: number;
  deliverable: string;
  workstream: string;
  status: string;
  owner: string;
  timeline: string;
  category: string;
  priority: string;
  notes: string;
  due_date?: string;
  created_by_leadership?: number;
  updated_at: string;
  comment_count?: number;
  dept_dependencies?: DeptDep[];
}

interface Comment {
  id: number;
  task_id: number;
  user_name: string;
  team_name: string;
  team_slug: string;
  content: string;
  created_at: string;
}

interface AuditEntry {
  id: number;
  user_name: string;
  action_type: string;
  details: string;
  created_at: string;
}

const ALL_TEAMS = [
  { slug: "engineering", name: "Engineering" },
  { slug: "bd", name: "Business Development" },
  { slug: "defi", name: "DeFi/Exchange" },
  { slug: "legal", name: "Legal & Compliance" },
  { slug: "marketing", name: "Marketing" },
];

const STATUS_OPTIONS = [
  "OPEN",
  "IN PROGRESS",
  "IN FLIGHT",
  "PLANNED",
  "REVIEW",
  "AUDIT-GATED",
  "BLOCKED",
  "COMPLETED",
];

const priorityConfig: Record<string, { color: string; label: string }> = {
  CRITICAL: { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "CRITICAL" },
  HIGH: { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "HIGH" },
  MEDIUM: { color: "text-slate-400 bg-slate-500/10 border-slate-500/20", label: "MED" },
  LOW: { color: "text-slate-500 bg-slate-500/5 border-slate-500/10", label: "LOW" },
};

const teamColorMap: Record<string, string> = {
  engineering: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  bd: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  defi: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  legal: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  marketing: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const done = task.status === "COMPLETED" || task.status === "DONE";
  if (done) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.due_date < today;
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function TaskCard({
  task,
  onUpdate,
  onDepsChange,
  readOnly = false,
  forceExpand = false,
  currentTeamSlug,
}: {
  task: Task;
  onUpdate: (id: number, data: any) => Promise<void>;
  onDepsChange?: () => void;
  readOnly?: boolean;
  forceExpand?: boolean;
  currentTeamSlug?: string;
}) {
  const [expanded, setExpanded] = useState(forceExpand);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (forceExpand) setExpanded(true);
  }, [forceExpand]);
  const [status, setStatus] = useState(task.status);
  const [owner, setOwner] = useState(task.owner);
  const [notes, setNotes] = useState(task.notes || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [saving, setSaving] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(task.comment_count || 0);

  // Department dependency state
  const [showAddDep, setShowAddDep] = useState(false);
  const [savingDep, setSavingDep] = useState(false);
  const [depNote, setDepNote] = useState("");
  const [selectedDepTeam, setSelectedDepTeam] = useState<string | null>(null);
  const [localDeptDeps, setLocalDeptDeps] = useState<DeptDep[]>(task.dept_dependencies || []);

  // Audit log state
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Sync local deps when task prop changes
  useEffect(() => {
    setLocalDeptDeps(task.dept_dependencies || []);
  }, [task.dept_dependencies]);

  const isCompleted = task.status === "COMPLETED" || task.status === "DONE";
  const overdue = isOverdue(task);
  const pConfig = priorityConfig[task.priority] || priorityConfig["MEDIUM"];
  const hasDeps = localDeptDeps.length > 0;

  // Available teams to add (exclude own team and already-linked teams)
  const availableTeams = ALL_TEAMS.filter(
    (t) => t.slug !== currentTeamSlug && !localDeptDeps.some((d) => d.depends_on_team_slug === t.slug)
  );

  async function handleSave() {
    setSaving(true);
    await onUpdate(task.id, { status, owner, notes, due_date: dueDate || null });
    setEditing(false);
    setSaving(false);
  }

  function handleCancel() {
    setStatus(task.status);
    setOwner(task.owner);
    setNotes(task.notes || "");
    setDueDate(task.due_date || "");
    setEditing(false);
  }

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } finally {
      setLoadingComments(false);
    }
  }

  async function loadAuditLog() {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/audit`);
      if (res.ok) {
        const data = await res.json();
        setAuditEntries(data.logs || []);
      }
    } finally {
      setLoadingAudit(false);
    }
  }

  async function handleToggleComments(e: React.MouseEvent) {
    e.stopPropagation();
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
  }

  async function handleToggleAuditLog(e: React.MouseEvent) {
    e.stopPropagation();
    if (!showAuditLog) {
      await loadAuditLog();
    }
    setShowAuditLog(!showAuditLog);
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setNewComment("");
        setLocalCommentCount((c) => c + 1);
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  // Department dependency management
  async function handleAddDeptDep(teamSlug: string) {
    setSavingDep(true);
    try {
      const res = await fetch("/api/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, depends_on_team_slug: teamSlug, note: depNote.trim() }),
      });
      if (res.ok) {
        const team = ALL_TEAMS.find((t) => t.slug === teamSlug);
        setLocalDeptDeps((prev) => [...prev, {
          depends_on_team_slug: teamSlug,
          team_name: team?.name || teamSlug,
          note: depNote.trim(),
        }]);
        setDepNote("");
        setSelectedDepTeam(null);
        setShowAddDep(false);
        onDepsChange?.();
      }
    } finally {
      setSavingDep(false);
    }
  }

  async function handleRemoveDeptDep(e: React.MouseEvent, teamSlug: string) {
    e.stopPropagation();
    try {
      await fetch("/api/dependencies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, depends_on_team_slug: teamSlug }),
      });
      setLocalDeptDeps((prev) => prev.filter((d) => d.depends_on_team_slug !== teamSlug));
      onDepsChange?.();
    } catch { /* ignore */ }
  }

  return (
    <div className={`bg-[#0d1a2d] border rounded-xl hover:border-white/[0.08] transition-all duration-200 ${
      overdue ? "border-red-500/30 ring-1 ring-red-500/10" :
      isCompleted ? "opacity-50 border-white/[0.04]" :
      "border-white/[0.04]"
    }`}>
      <div
        className="px-4 py-3.5 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status line indicator */}
        <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 mt-1 ${
          overdue ? "bg-red-500" :
          isCompleted ? "bg-emerald-500/50" :
          task.status === "BLOCKED" ? "bg-red-500/50" :
          task.status === "AUDIT-GATED" ? "bg-orange-500/50" :
          ["IN PROGRESS", "IN FLIGHT"].includes(task.status) ? "bg-cyan-500/50" :
          "bg-slate-700/50"
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={task.status} />
            {/* OVERDUE badge */}
            {overdue && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-red-400 bg-red-500/15 border-red-500/30 animate-pulse">
                OVERDUE {daysOverdue(task.due_date!)}d
              </span>
            )}
            {task.workstream && (
              <span className="text-[10px] text-slate-600 font-mono bg-white/[0.03] px-1.5 py-0.5 rounded">
                WS {task.workstream}
              </span>
            )}
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${pConfig.color}`}>
              {pConfig.label}
            </span>
            {/* Comment count badge */}
            {localCommentCount > 0 && (
              <button
                onClick={handleToggleComments}
                className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-cyan-400 transition-colors bg-white/[0.03] px-1.5 py-0.5 rounded"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                {localCommentCount}
              </button>
            )}
            {/* Department dependency indicator */}
            {hasDeps && (
              <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                {localDeptDeps.length} dept{localDeptDeps.length !== 1 ? "s" : ""}
              </span>
            )}
            {task.created_by_leadership === 1 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                ⭐ Leadership
              </span>
            )}
          </div>
          <p className={`text-sm font-medium leading-snug ${
            overdue ? "text-red-300" :
            isCompleted ? "text-slate-500 line-through" : "text-slate-200"
          }`}>
            {task.deliverable}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            {task.owner && task.owner !== "Unassigned" && (
              <span className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-cyan-400">{task.owner[0]}</span>
                </div>
                {task.owner}
              </span>
            )}
            {task.due_date && (
              <span className={`flex items-center gap-1 ${overdue ? "text-red-400 font-semibold" : ""}`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Due {task.due_date}
              </span>
            )}
            {task.timeline && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {task.timeline}
              </span>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-slate-600 transition-transform mt-1 flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/[0.04] pt-3 ml-3.5">
          {/* DEPENDS ON DEPARTMENTS section */}
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">
                Depends On {hasDeps && `(${localDeptDeps.length})`}
              </span>
              {!readOnly && availableTeams.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddDep(!showAddDep); setDepNote(""); setSelectedDepTeam(null); }}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {showAddDep ? "CANCEL" : "ADD"}
                </button>
              )}
            </div>
            {hasDeps ? (
              <div className="space-y-1">
                {localDeptDeps.map((d) => {
                  const colors = teamColorMap[d.depends_on_team_slug] || "text-slate-400 bg-slate-500/10 border-slate-500/20";
                  return (
                    <div key={d.depends_on_team_slug} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md border ${colors}`}>
                      <span className="font-semibold flex-shrink-0">{d.team_name}</span>
                      {d.note && (
                        <span className="text-[10px] text-slate-400 truncate flex-1 italic">&mdash; {d.note}</span>
                      )}
                      {!d.note && <span className="flex-1" />}
                      {!readOnly && (
                        <button
                          onClick={(e) => handleRemoveDeptDep(e, d.depends_on_team_slug)}
                          className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0 ml-1"
                          title="Remove dependency"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !showAddDep ? (
              <p className="text-[10px] text-slate-700 italic">No department dependencies.</p>
            ) : null}

            {/* Add department dependency */}
            {showAddDep && (
              <div className="mt-2 bg-white/[0.02] rounded-lg border border-white/[0.06] p-2.5">
                <p className="text-[10px] text-slate-500 mb-2">Select a department:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {availableTeams.map((t) => {
                    const colors = teamColorMap[t.slug] || "text-slate-400 bg-slate-500/10 border-slate-500/20";
                    const isSelected = selectedDepTeam === t.slug;
                    return (
                      <button
                        key={t.slug}
                        onClick={() => setSelectedDepTeam(isSelected ? null : t.slug)}
                        className={`px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-all ${
                          isSelected
                            ? `${colors} ring-2 ring-white/20`
                            : `${colors} opacity-60 hover:opacity-100`
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
                {selectedDepTeam && (
                  <>
                    <input
                      type="text"
                      value={depNote}
                      onChange={(e) => setDepNote(e.target.value)}
                      placeholder="Optional: what do you need from them?"
                      className="w-full px-2.5 py-2 bg-white/[0.03] border border-white/[0.08] rounded-md text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 placeholder-slate-600 mb-2"
                    />
                    <button
                      onClick={() => handleAddDeptDep(selectedDepTeam)}
                      disabled={savingDep}
                      className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[11px] font-semibold rounded-md hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 tracking-wide"
                    >
                      {savingDep ? "SAVING..." : "SAVE"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {!editing ? (
            <div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Category</span>
                  <p className="text-slate-400 mt-0.5">{task.category || "---"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Due Date</span>
                  <p className={`mt-0.5 ${overdue ? "text-red-400 font-semibold" : "text-slate-400"}`}>
                    {task.due_date || "No due date"}
                  </p>
                </div>
              </div>
              {task.notes && (
                <div className="mb-3">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Notes</span>
                  <p className="text-slate-400 text-sm mt-0.5 whitespace-pre-wrap bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">{task.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {!readOnly && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    EDIT TASK
                  </button>
                )}
                <button
                  onClick={handleToggleComments}
                  className="text-xs text-slate-500 hover:text-slate-300 font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  {showComments ? "HIDE COMMENTS" : `COMMENTS${localCommentCount > 0 ? ` (${localCommentCount})` : ""}`}
                </button>
                <button
                  onClick={handleToggleAuditLog}
                  className="text-xs text-slate-500 hover:text-slate-300 font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  {showAuditLog ? "HIDE HISTORY" : "HISTORY"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/20"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} className="bg-[#0d1a2d]">{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Owner</label>
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/20 placeholder-slate-600"
                  placeholder="Assign owner"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/20"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/20 resize-none placeholder-slate-600"
                  placeholder="Add notes..."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 shadow-lg shadow-cyan-500/10 tracking-wide"
                >
                  {saving ? "SAVING..." : "SAVE CHANGES"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-white/[0.08] text-slate-400 text-xs font-semibold rounded-lg hover:bg-white/[0.03] tracking-wide"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 border-t border-white/[0.04] pt-3" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium block mb-2">
                Comments & Updates
              </span>

              {/* Add comment form */}
              <form onSubmit={handleSubmitComment} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment or update..."
                  className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 placeholder-slate-600"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 tracking-wide flex-shrink-0"
                >
                  {submittingComment ? "..." : "POST"}
                </button>
              </form>

              {/* Comments list */}
              {loadingComments ? (
                <div className="text-center py-4">
                  <span className="text-xs text-slate-600">Loading comments...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-4">
                  <span className="text-xs text-slate-600">No comments yet. Be the first to add one.</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-[7px] font-bold text-cyan-400">{(c.user_name || c.team_name)[0]}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">{c.user_name || c.team_name}</span>
                        <span className="text-[9px] text-slate-600">{c.team_name}</span>
                        <span className="text-[9px] text-slate-600 ml-auto">
                          {new Date(c.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit Log Section */}
          {showAuditLog && (
            <div className="mt-4 border-t border-white/[0.04] pt-3" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium block mb-2">
                Change History
              </span>
              {loadingAudit ? (
                <div className="text-center py-4">
                  <span className="text-xs text-slate-600">Loading history...</span>
                </div>
              ) : auditEntries.length === 0 ? (
                <div className="text-center py-4">
                  <span className="text-xs text-slate-600">No changes recorded yet.</span>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                  {auditEntries.map((entry) => {
                    let details: any = {};
                    try { details = JSON.parse(entry.details); } catch {}
                    return (
                      <div key={entry.id} className="bg-white/[0.02] rounded-lg px-3 py-2 border border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-slate-300">{entry.user_name}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/[0.06] text-slate-400">
                            {entry.action_type}
                          </span>
                          <span className="text-[9px] text-slate-600 ml-auto">
                            {new Date(entry.created_at).toLocaleString()}
                          </span>
                        </div>
                        {details.changes && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {Object.entries(details.changes).map(([key, val]) => (
                              <span key={key} className="mr-3">
                                <span className="text-slate-600">{key}:</span>{" "}
                                {details.oldStatus && key === "status" ? (
                                  <><span className="text-red-400/70 line-through">{details.oldStatus}</span> → <span className="text-emerald-400">{String(val)}</span></>
                                ) : (
                                  <span className="text-slate-400">{String(val)}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.action_type === "comment_add" && (
                          <div className="text-[10px] text-slate-500 mt-0.5">Added a comment</div>
                        )}
                        {entry.action_type === "dependency_add" && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Added dependency on {details.dependsOnTeam}
                          </div>
                        )}
                        {entry.action_type === "dependency_remove" && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Removed dependency on {details.dependsOnTeam}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

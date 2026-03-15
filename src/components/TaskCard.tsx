"use client";

import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";

interface DepLink {
  id: number;
  deliverable: string;
  status: string;
  priority: string;
  team_name: string;
  team_slug: string;
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
  updated_at: string;
  comment_count?: number;
  depends_on?: DepLink[];
  blocking?: DepLink[];
}

interface Comment {
  id: number;
  task_id: number;
  team_name: string;
  team_slug: string;
  content: string;
  created_at: string;
}

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

function isRisk(status: string) {
  return !["COMPLETED", "DONE"].includes(status);
}

export default function TaskCard({
  task,
  onUpdate,
  readOnly = false,
  forceExpand = false,
}: {
  task: Task;
  onUpdate: (id: number, data: any) => Promise<void>;
  readOnly?: boolean;
  forceExpand?: boolean;
}) {
  const [expanded, setExpanded] = useState(forceExpand);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (forceExpand) setExpanded(true);
  }, [forceExpand]);
  const [status, setStatus] = useState(task.status);
  const [owner, setOwner] = useState(task.owner);
  const [notes, setNotes] = useState(task.notes || "");
  const [saving, setSaving] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(task.comment_count || 0);

  const isCompleted = task.status === "COMPLETED" || task.status === "DONE";
  const pConfig = priorityConfig[task.priority] || priorityConfig["MEDIUM"];

  const dependsOn = task.depends_on || [];
  const blocking = task.blocking || [];
  const hasRiskyDep = dependsOn.some((d) => isRisk(d.status));

  async function handleSave() {
    setSaving(true);
    await onUpdate(task.id, { status, owner, notes });
    setEditing(false);
    setSaving(false);
  }

  function handleCancel() {
    setStatus(task.status);
    setOwner(task.owner);
    setNotes(task.notes || "");
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

  async function handleToggleComments(e: React.MouseEvent) {
    e.stopPropagation();
    if (!showComments) {
      await loadComments();
    }
    setShowComments(!showComments);
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

  return (
    <div className={`bg-[#0d1a2d] border rounded-xl hover:border-white/[0.08] transition-all duration-200 ${
      isCompleted ? "opacity-50 border-white/[0.04]" :
      hasRiskyDep ? "border-red-500/20" :
      "border-white/[0.04]"
    }`}>
      <div
        className="px-4 py-3.5 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status line indicator */}
        <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 mt-1 ${
          isCompleted ? "bg-emerald-500/50" :
          task.status === "BLOCKED" ? "bg-red-500/50" :
          task.status === "AUDIT-GATED" ? "bg-orange-500/50" :
          ["IN PROGRESS", "IN FLIGHT"].includes(task.status) ? "bg-cyan-500/50" :
          "bg-slate-700/50"
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <StatusBadge status={task.status} />
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
            {/* Dependency indicators */}
            {dependsOn.length > 0 && (
              <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                hasRiskyDep ? "text-red-400 bg-red-500/10" : "text-emerald-400 bg-emerald-500/10"
              }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                {dependsOn.length} dep{dependsOn.length !== 1 ? "s" : ""}
              </span>
            )}
            {blocking.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                blocks {blocking.length}
              </span>
            )}
          </div>
          <p className={`text-sm font-medium leading-snug ${isCompleted ? "text-slate-500 line-through" : "text-slate-200"}`}>
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
          {/* Dependency details */}
          {dependsOn.length > 0 && (
            <div className="mb-3">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Depends On</span>
              <div className="mt-1 space-y-1">
                {dependsOn.map((d) => (
                  <div key={d.id} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-md border ${
                    isRisk(d.status) ? "bg-red-500/5 border-red-500/15 text-red-300" : "bg-emerald-500/5 border-emerald-500/15 text-emerald-300"
                  }`}>
                    <StatusBadge status={d.status} />
                    <span className="truncate flex-1">{d.deliverable}</span>
                    <span className="text-[9px] text-slate-500 flex-shrink-0">{d.team_name}</span>
                    {isRisk(d.status) && (
                      <span className="text-[9px] text-red-400 font-semibold flex-shrink-0">AT RISK</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {blocking.length > 0 && (
            <div className="mb-3">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Blocking</span>
              <div className="mt-1 space-y-1">
                {blocking.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md border bg-amber-500/5 border-amber-500/15 text-amber-300">
                    <StatusBadge status={d.status} />
                    <span className="truncate flex-1">{d.deliverable}</span>
                    <span className="text-[9px] text-slate-500 flex-shrink-0">{d.team_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!editing ? (
            <div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Category</span>
                  <p className="text-slate-400 mt-0.5">{task.category || "---"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Last Updated</span>
                  <p className="text-slate-400 mt-0.5">{task.updated_at ? new Date(task.updated_at).toLocaleDateString() : "---"}</p>
                </div>
              </div>
              {task.notes && (
                <div className="mb-3">
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">Notes</span>
                  <p className="text-slate-400 text-sm mt-0.5 whitespace-pre-wrap bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">{task.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
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
                          <span className="text-[7px] font-bold text-cyan-400">{c.team_name[0]}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">{c.team_name}</span>
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
        </div>
      )}
    </div>
  );
}

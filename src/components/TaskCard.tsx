"use client";

import { useState } from "react";
import StatusBadge from "./StatusBadge";

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

const priorityColors: Record<string, string> = {
  CRITICAL: "text-red-600",
  HIGH: "text-orange-600",
  MEDIUM: "text-yellow-600",
  LOW: "text-gray-500",
};

export default function TaskCard({
  task,
  onUpdate,
  readOnly = false,
}: {
  task: Task;
  onUpdate: (id: number, data: any) => Promise<void>;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [owner, setOwner] = useState(task.owner);
  const [notes, setNotes] = useState(task.notes || "");
  const [saving, setSaving] = useState(false);

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

  return (
    <div className={`bg-white border rounded-xl shadow-sm hover:shadow-md transition-all ${
      task.status === "COMPLETED" || task.status === "DONE" ? "opacity-70" : ""
    }`}>
      <div
        className="px-4 py-3 cursor-pointer flex items-start gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <StatusBadge status={task.status} />
            {task.workstream && (
              <span className="text-xs text-gray-400 font-mono">WS {task.workstream}</span>
            )}
            <span className={`text-xs font-medium ${priorityColors[task.priority] || "text-gray-500"}`}>
              {task.priority}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 leading-snug">{task.deliverable}</p>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
            {task.owner && task.owner !== "Unassigned" && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {task.owner}
              </span>
            )}
            {task.timeline && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {task.timeline}
              </span>
            )}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform mt-1 flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {!editing ? (
            <div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <span className="text-gray-500 text-xs">Category</span>
                  <p className="text-gray-700">{task.category || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-500 text-xs">Last Updated</span>
                  <p className="text-gray-700">{task.updated_at ? new Date(task.updated_at).toLocaleDateString() : "—"}</p>
                </div>
              </div>
              {task.notes && (
                <div className="mb-3">
                  <span className="text-gray-500 text-xs">Notes</span>
                  <p className="text-gray-700 text-sm mt-0.5 whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}
              {!readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edit Task
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Owner</label>
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Assign owner"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add notes..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

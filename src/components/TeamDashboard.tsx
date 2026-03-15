"use client";

import { useState, useMemo, useEffect } from "react";
import TaskCard from "./TaskCard";
import ProgressRing from "./ProgressRing";
import TimelineView from "./TimelineView";

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
}

interface TeamMember {
  id: number;
  display_name: string;
}

// Grouped status buckets matching KPI cards
const STATUS_GROUPS: Record<string, { label: string; statuses: string[]; dot: string; text: string }> = {
  ACTIVE: { label: "Active", statuses: ["IN PROGRESS", "IN FLIGHT", "REVIEW"], dot: "bg-cyan-400", text: "text-cyan-400" },
  OPEN: { label: "Open", statuses: ["OPEN", "PLANNED"], dot: "bg-slate-500", text: "text-slate-300" },
  BLOCKED: { label: "Blocked", statuses: ["BLOCKED", "AUDIT-GATED", "PENDING AUDIT"], dot: "bg-orange-400", text: "text-orange-400" },
  DONE: { label: "Done", statuses: ["COMPLETED", "DONE"], dot: "bg-emerald-400", text: "text-emerald-400" },
  OVERDUE: { label: "Overdue", statuses: [], dot: "bg-red-500", text: "text-red-400" },
};

function getGroupForStatus(status: string): string {
  for (const [group, config] of Object.entries(STATUS_GROUPS)) {
    if (config.statuses.includes(status)) return group;
  }
  return "OPEN";
}

function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const done = task.status === "COMPLETED" || task.status === "DONE";
  if (done) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.due_date < today;
}

interface IncomingDep {
  task_id: number;
  task_deliverable: string;
  task_status: string;
  task_priority: string;
  task_team_name: string;
  task_team_slug: string;
  note: string;
}

export default function TeamDashboard({
  tasks: initialTasks,
  teamName,
  teamSlug,
  pillar,
  readOnly = false,
  onRefresh,
}: {
  tasks: Task[];
  teamName: string;
  teamSlug?: string;
  pillar: string;
  readOnly?: boolean;
  onRefresh?: () => void;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [incomingDeps, setIncomingDeps] = useState<IncomingDep[]>([]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Fetch incoming dependencies (tasks from OTHER teams that depend on this team)
  useEffect(() => {
    if (!teamSlug || teamSlug === "leadership") return;
    async function fetchIncoming() {
      try {
        const res = await fetch("/api/dependencies");
        if (res.ok) {
          const data = await res.json();
          const incoming = (data.dependencies || []).filter(
            (d: any) => d.depends_on_team_slug === teamSlug
          );
          setIncomingDeps(incoming);
        }
      } catch { /* ignore */ }
    }
    fetchIncoming();
  }, [teamSlug, initialTasks]);

  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tasks" | "timeline">("tasks");

  // Add Task state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ deliverable: "", priority: "MEDIUM", status: "OPEN", owner: "", due_date: "", notes: "", category: "", workstream: "" });
  const [savingTask, setSavingTask] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!showAddTask || !teamSlug) return;
    async function fetchMembers() {
      const res = await fetch(`/api/teams/members?team=${teamSlug}`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    }
    fetchMembers();
  }, [showAddTask, teamSlug]);

  async function handleCreateTask() {
    if (!newTask.deliverable.trim()) return;
    setSavingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, team_slug: teamSlug }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [...prev, data.task]);
        setNewTask({ deliverable: "", priority: "MEDIUM", status: "OPEN", owner: "", due_date: "", notes: "", category: "", workstream: "" });
        setShowAddTask(false);
        onRefresh?.();
      }
    } finally {
      setSavingTask(false);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [tasks]);

  // Which raw statuses actually exist in the data
  const rawStatuses = useMemo(() => {
    return new Set(tasks.map((t) => t.status));
  }, [tasks]);

  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterGroup === "OVERDUE") {
        if (!isOverdue(t)) return false;
      } else if (filterGroup !== "ALL") {
        const group = STATUS_GROUPS[filterGroup];
        if (group && !group.statuses.includes(t.status)) return false;
      }
      if (filterCategory !== "ALL" && t.category !== filterCategory) return false;
      if (filterPriority !== "ALL" && t.priority !== filterPriority) return false;
      if (searchQuery && !t.deliverable.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !t.owner.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterGroup, filterCategory, filterPriority, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => STATUS_GROUPS.DONE.statuses.includes(t.status)).length;
    const inProgress = tasks.filter((t) => STATUS_GROUPS.ACTIVE.statuses.includes(t.status)).length;
    const blocked = tasks.filter((t) => STATUS_GROUPS.BLOCKED.statuses.includes(t.status)).length;
    const open = tasks.filter((t) => STATUS_GROUPS.OPEN.statuses.includes(t.status)).length;
    return { total, completed, inProgress, blocked, open };
  }, [tasks]);

  async function handleUpdate(id: number, data: any) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { task } = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    }
  }

  function handleKpiClick(group: string) {
    setFilterGroup((prev) => (prev === group ? "ALL" : group));
  }

  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const isBlocked = filterGroup === "BLOCKED";

  // Status distribution for bar chart
  const statusDist = useMemo(() => {
    const dist: Record<string, number> = {};
    tasks.forEach((t) => {
      dist[t.status] = (dist[t.status] || 0) + 1;
    });
    return Object.entries(dist).sort((a, b) => b[1] - a[1]);
  }, [tasks]);

  const statusBarColors: Record<string, string> = {
    "OPEN": "bg-slate-500",
    "IN PROGRESS": "bg-cyan-500",
    "IN FLIGHT": "bg-cyan-400",
    "PLANNED": "bg-indigo-500",
    "REVIEW": "bg-amber-500",
    "AUDIT-GATED": "bg-orange-500",
    "COMPLETED": "bg-emerald-500",
    "DONE": "bg-emerald-500",
    "BLOCKED": "bg-red-500",
    "PENDING AUDIT": "bg-orange-400",
  };

  // Build dropdown options: always show all grouped buckets
  const dropdownOptions = useMemo(() => {
    const options: { value: string; label: string; isGroup: boolean }[] = [];
    for (const [key, config] of Object.entries(STATUS_GROUPS)) {
      if (key === "OVERDUE") {
        if (overdueCount > 0) {
          options.push({ value: "OVERDUE", label: `Overdue (${overdueCount})`, isGroup: true });
        }
        continue;
      }
      const count = tasks.filter((t) => config.statuses.includes(t.status)).length;
      const subLabels = config.statuses.filter((s) => rawStatuses.has(s));
      const suffix = subLabels.length > 0 ? ` — ${subLabels.join(", ")}` : "";
      options.push({
        value: key,
        label: `${config.label} (${count})${suffix}`,
        isGroup: true,
      });
    }
    return options;
  }, [tasks, rawStatuses, overdueCount]);

  return (
    <div>
      {/* Overdue Alert Banner */}
      {overdueCount > 0 && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-400">
              {overdueCount} Overdue Task{overdueCount !== 1 ? "s" : ""}
            </h3>
            <p className="text-[11px] text-red-400/70 mt-0.5">
              These tasks have passed their due date and need immediate attention.
            </p>
          </div>
          <button
            onClick={() => handleKpiClick("OVERDUE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterGroup === "OVERDUE"
                ? "bg-red-500 text-white"
                : "text-red-400 border border-red-500/30 hover:bg-red-500/20"
            }`}
          >
            {filterGroup === "OVERDUE" ? "Showing Overdue" : "View All"}
          </button>
        </div>
      )}

      {/* KPI Cards + Progress Ring */}
      <div className={`grid grid-cols-2 ${overdueCount > 0 ? "lg:grid-cols-7" : "lg:grid-cols-6"} gap-3 mb-6`}>
        {/* Progress Ring */}
        <div className="col-span-2 lg:col-span-1 bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4 flex items-center justify-center">
          <ProgressRing percentage={progressPct} size={90} color="#22d3ee" label="Complete" />
        </div>

        {/* Total — clicking shows ALL */}
        <button
          onClick={() => handleKpiClick("ALL")}
          className={`bg-[#0d1a2d] border rounded-xl p-4 text-left transition-all duration-200 ${
            filterGroup === "ALL"
              ? "border-slate-400/30 ring-1 ring-slate-400/20"
              : "border-white/[0.04] hover:border-white/[0.08]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </button>

        {/* Active */}
        <button
          onClick={() => handleKpiClick("ACTIVE")}
          className={`bg-[#0d1a2d] border rounded-xl p-4 text-left transition-all duration-200 ${
            filterGroup === "ACTIVE"
              ? "border-cyan-400/30 ring-1 ring-cyan-400/20"
              : "border-white/[0.04] hover:border-white/[0.08]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{stats.inProgress}</div>
          {filterGroup === "ACTIVE" && (
            <div className="text-[9px] text-cyan-600 mt-1">In Progress, In Flight, Review</div>
          )}
        </button>

        {/* Open */}
        <button
          onClick={() => handleKpiClick("OPEN")}
          className={`bg-[#0d1a2d] border rounded-xl p-4 text-left transition-all duration-200 ${
            filterGroup === "OPEN"
              ? "border-slate-400/30 ring-1 ring-slate-400/20"
              : "border-white/[0.04] hover:border-white/[0.08]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Open</span>
          </div>
          <div className="text-2xl font-bold text-slate-300">{stats.open}</div>
          {filterGroup === "OPEN" && (
            <div className="text-[9px] text-slate-600 mt-1">Open, Planned</div>
          )}
        </button>

        {/* Blocked */}
        <button
          onClick={() => handleKpiClick("BLOCKED")}
          className={`bg-[#0d1a2d] border rounded-xl p-4 text-left transition-all duration-200 ${
            filterGroup === "BLOCKED"
              ? "border-orange-400/30 ring-1 ring-orange-400/20"
              : "border-white/[0.04] hover:border-white/[0.08]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Blocked</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{stats.blocked}</div>
          {filterGroup === "BLOCKED" && (
            <div className="text-[9px] text-orange-600 mt-1">Blocked, Audit-Gated</div>
          )}
        </button>

        {/* Done */}
        <button
          onClick={() => handleKpiClick("DONE")}
          className={`bg-[#0d1a2d] border rounded-xl p-4 text-left transition-all duration-200 ${
            filterGroup === "DONE"
              ? "border-emerald-400/30 ring-1 ring-emerald-400/20"
              : "border-white/[0.04] hover:border-white/[0.08]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Done</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
          {filterGroup === "DONE" && (
            <div className="text-[9px] text-emerald-600 mt-1">Completed</div>
          )}
        </button>

        {/* Overdue KPI Card */}
        {overdueCount > 0 && (
          <button
            onClick={() => handleKpiClick("OVERDUE")}
            className={`bg-[#0d1a2d] border rounded-xl p-4 text-left transition-all duration-200 ${
              filterGroup === "OVERDUE"
                ? "border-red-400/30 ring-1 ring-red-400/20"
                : "border-red-500/10 hover:border-red-500/20"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-500 uppercase tracking-wider font-medium">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-400">{overdueCount}</div>
            {filterGroup === "OVERDUE" && (
              <div className="text-[9px] text-red-600 mt-1">Past due date</div>
            )}
          </button>
        )}
      </div>

      {/* Incoming Dependencies Section — always visible above task list for team dashboards */}
      {teamSlug && teamSlug !== "leadership" && (
        <div className="mb-6 bg-[#0d1a2d] border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">📥</span>
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              Incoming Dependencies
            </h3>
            {incomingDeps.length > 0 && (
              <span className="text-xs text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">{incomingDeps.length}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mb-3 ml-7">
            Other teams that are waiting on {teamName}
          </p>
          {incomingDeps.length === 0 ? (
            <div className="text-center py-5 ml-7">
              <svg className="w-6 h-6 text-slate-700 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-slate-600 text-xs">No teams are currently depending on you</p>
            </div>
          ) : (
            <div className="space-y-1.5 ml-7">
              {incomingDeps.map((d, i) => {
                const isUrgent = d.task_priority === "CRITICAL" || d.task_status === "BLOCKED";
                return (
                  <div key={i} className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${
                    isUrgent
                      ? "bg-red-500/5 border-red-500/15"
                      : "bg-white/[0.02] border-white/[0.04]"
                  }`}>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0 mt-0.5 ${
                      d.task_priority === "CRITICAL" ? "text-red-400 bg-red-500/10" :
                      d.task_priority === "HIGH" ? "text-amber-400 bg-amber-500/10" :
                      "text-slate-400 bg-slate-500/10"
                    }`}>
                      {d.task_priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-medium ${isUrgent ? "text-red-300" : "text-slate-300"}`}>
                        <span className="font-semibold text-slate-400">{d.task_team_name}</span>
                        <span className="text-slate-600 mx-1.5">needs</span>
                        <span>{d.task_deliverable}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-slate-600">{d.task_status}</span>
                        {d.note && (
                          <span className="text-[9px] text-slate-500 italic" title={d.note}>
                            &mdash; &quot;{d.note}&quot;
                          </span>
                        )}
                      </div>
                    </div>
                    {isUrgent && (
                      <span className="text-[9px] text-red-400 font-semibold flex-shrink-0 px-1.5 py-0.5 bg-red-500/10 rounded mt-0.5">
                        URGENT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Task Button + Form */}
      {!readOnly && (
        <div className="mb-6">
          {!showAddTask ? (
            <button
              onClick={() => setShowAddTask(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/15 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Task
            </button>
          ) : (
            <div className="bg-[#0d1a2d] border border-cyan-500/20 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">New Task</h3>
                <button onClick={() => setShowAddTask(false)} className="text-slate-500 hover:text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Task Name *</label>
                  <input
                    value={newTask.deliverable}
                    onChange={(e) => setNewTask({ ...newTask, deliverable: e.target.value })}
                    placeholder="What needs to be done?"
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 placeholder-slate-600"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    >
                      <option value="CRITICAL" className="bg-[#0d1a2d]">Critical</option>
                      <option value="HIGH" className="bg-[#0d1a2d]">High</option>
                      <option value="MEDIUM" className="bg-[#0d1a2d]">Medium</option>
                      <option value="LOW" className="bg-[#0d1a2d]">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Status</label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    >
                      <option value="OPEN" className="bg-[#0d1a2d]">Open</option>
                      <option value="IN PROGRESS" className="bg-[#0d1a2d]">In Progress</option>
                      <option value="PLANNED" className="bg-[#0d1a2d]">Planned</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Owner</label>
                    <select
                      value={newTask.owner}
                      onChange={(e) => setNewTask({ ...newTask, owner: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    >
                      <option value="" className="bg-[#0d1a2d]">Unassigned</option>
                      {teamMembers.map((m) => (
                        <option key={m.id} value={m.display_name} className="bg-[#0d1a2d]">{m.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Category</label>
                    <input
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      placeholder="e.g. SDK, DeFi, OCC Charter"
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Workstream</label>
                    <input
                      value={newTask.workstream}
                      onChange={(e) => setNewTask({ ...newTask, workstream: e.target.value })}
                      placeholder="e.g. 1.1, 2.3"
                      className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 placeholder-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">Notes</label>
                  <textarea
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional details..."
                    className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none placeholder-slate-600"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCreateTask}
                    disabled={savingTask || !newTask.deliverable.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 shadow-lg shadow-cyan-500/10 tracking-wide"
                  >
                    {savingTask ? "CREATING..." : "CREATE TASK"}
                  </button>
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="px-4 py-2 border border-white/[0.08] text-slate-400 text-xs font-semibold rounded-lg hover:bg-white/[0.03] tracking-wide"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legal & Compliance: Audit Export */}
      {teamSlug === "legal" && (
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => window.open("/api/admin/audit?format=csv&limit=10000", "_blank")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/10 transition-all font-semibold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Full Audit Log (CSV)
          </button>
          <span className="text-[10px] text-slate-600">For compliance records</span>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-1 mb-6 bg-[#0d1a2d] border border-white/[0.04] rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewMode("tasks")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
            viewMode === "tasks"
              ? "bg-white/[0.08] text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          Tasks
        </button>
        <button
          onClick={() => setViewMode("timeline")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
            viewMode === "timeline"
              ? "bg-white/[0.08] text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          Timeline
        </button>
      </div>

      {viewMode === "timeline" ? (
        <TimelineView tasks={tasks} />
      ) : (
      <>
      {/* Status Distribution Bar */}
      <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Status Distribution</span>
          <span className="text-[10px] text-slate-600">{stats.total} deliverables</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex bg-white/[0.03]">
          {statusDist.map(([s, count]) => (
            <div
              key={s}
              className={`${statusBarColors[s] || "bg-slate-600"} transition-all duration-500 cursor-pointer hover:opacity-80`}
              style={{ width: `${(count / stats.total) * 100}%` }}
              title={`${s}: ${count}`}
              onClick={() => {
                const group = getGroupForStatus(s);
                handleKpiClick(group);
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          {statusDist.map(([s, count]) => (
            <button
              key={s}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              onClick={() => {
                const group = getGroupForStatus(s);
                handleKpiClick(group);
              }}
            >
              <div className={`w-2 h-2 rounded-sm ${statusBarColors[s] || "bg-slate-600"}`} />
              <span className="text-[10px] text-slate-500">{s} ({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active filter indicator */}
      {filterGroup !== "ALL" && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider">Filtered by:</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${STATUS_GROUPS[filterGroup]?.text || "text-slate-300"} bg-white/[0.04]`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_GROUPS[filterGroup]?.dot || "bg-slate-400"}`} />
            {STATUS_GROUPS[filterGroup]?.label || filterGroup}
          </span>
          <button
            onClick={() => setFilterGroup("ALL")}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors ml-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] md:flex-none md:w-72">
          <svg className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search tasks or owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/20 placeholder-slate-600"
          />
        </div>
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        >
          <option value="ALL" className="bg-[#0d1a2d]">All Statuses</option>
          {dropdownOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0d1a2d]">{opt.label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        >
          <option value="ALL" className="bg-[#0d1a2d]">All Priorities</option>
          <option value="CRITICAL" className="bg-[#0d1a2d]">Critical</option>
          <option value="HIGH" className="bg-[#0d1a2d]">High</option>
          <option value="MEDIUM" className="bg-[#0d1a2d]">Medium</option>
          <option value="LOW" className="bg-[#0d1a2d]">Low</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        >
          <option value="ALL" className="bg-[#0d1a2d]">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c} className="bg-[#0d1a2d]">{c}</option>
          ))}
        </select>
      </div>

      {/* Blocked banner when viewing blocked tasks */}
      {isBlocked && filteredTasks.length > 0 && (
        <div className="mb-4 bg-orange-500/5 border border-orange-500/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              {filteredTasks.length} Blocked / Gated Deliverable{filteredTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            These tasks are waiting on dependencies, audits, or external approvals. Notes and blocking reasons are shown below.
          </p>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-slate-500 text-sm">No tasks match your filters</p>
            <p className="text-slate-600 text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={handleUpdate}
              onDepsChange={onRefresh}
              readOnly={readOnly}
              forceExpand={isBlocked}
              currentTeamSlug={teamSlug}
            />
          ))
        )}
      </div>

      </>
      )}
    </div>
  );
}

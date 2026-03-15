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
  updated_at: string;
}

// Grouped status buckets matching KPI cards
const STATUS_GROUPS: Record<string, { label: string; statuses: string[]; dot: string; text: string }> = {
  ACTIVE: { label: "Active", statuses: ["IN PROGRESS", "IN FLIGHT", "REVIEW"], dot: "bg-cyan-400", text: "text-cyan-400" },
  OPEN: { label: "Open", statuses: ["OPEN", "PLANNED"], dot: "bg-slate-500", text: "text-slate-300" },
  BLOCKED: { label: "Blocked", statuses: ["BLOCKED", "AUDIT-GATED", "PENDING AUDIT"], dot: "bg-orange-400", text: "text-orange-400" },
  DONE: { label: "Done", statuses: ["COMPLETED", "DONE"], dot: "bg-emerald-400", text: "text-emerald-400" },
};

function getGroupForStatus(status: string): string {
  for (const [group, config] of Object.entries(STATUS_GROUPS)) {
    if (config.statuses.includes(status)) return group;
  }
  return "OPEN";
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

  const categories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [tasks]);

  // Which raw statuses actually exist in the data
  const rawStatuses = useMemo(() => {
    return new Set(tasks.map((t) => t.status));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterGroup !== "ALL") {
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
  }, [tasks, rawStatuses]);

  return (
    <div>
      {/* KPI Cards + Progress Ring */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
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
      </div>

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

      {/* Incoming Dependencies Section */}
      {teamSlug && teamSlug !== "leadership" && incomingDeps.length > 0 && (
        <div className="mt-6 bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Incoming Dependencies ({incomingDeps.length})
            </h3>
          </div>
          <p className="text-[10px] text-slate-600 mb-3">
            Tasks from other teams that depend on {teamName}
          </p>
          <div className="space-y-1.5">
            {incomingDeps.map((d, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white/[0.02] border-white/[0.04]">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0 ${
                  d.task_priority === "CRITICAL" ? "text-red-400 bg-red-500/10" :
                  d.task_priority === "HIGH" ? "text-amber-400 bg-amber-500/10" :
                  "text-slate-400 bg-slate-500/10"
                }`}>
                  {d.task_priority}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-300 truncate">{d.task_deliverable}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500">{d.task_team_name}</span>
                    <span className="text-[9px] text-slate-600">{d.task_status}</span>
                  </div>
                </div>
                {d.note && (
                  <span className="text-[9px] text-slate-500 italic flex-shrink-0 max-w-[200px] truncate" title={d.note}>
                    {d.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import TaskCard from "./TaskCard";
import ProgressRing from "./ProgressRing";

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

export default function TeamDashboard({
  tasks: initialTasks,
  teamName,
  pillar,
  readOnly = false,
}: {
  tasks: Task[];
  teamName: string;
  pillar: string;
  readOnly?: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [tasks]);

  const statuses = useMemo(() => {
    const s = new Set(tasks.map((t) => t.status));
    return Array.from(s).sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "ALL" && t.status !== filterStatus) return false;
      if (filterCategory !== "ALL" && t.category !== filterCategory) return false;
      if (searchQuery && !t.deliverable.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !t.owner.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterStatus, filterCategory, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED" || t.status === "DONE").length;
    const inProgress = tasks.filter((t) =>
      ["IN PROGRESS", "IN FLIGHT", "REVIEW"].includes(t.status)
    ).length;
    const blocked = tasks.filter((t) =>
      ["BLOCKED", "AUDIT-GATED"].includes(t.status)
    ).length;
    const open = tasks.filter((t) => t.status === "OPEN" || t.status === "PLANNED").length;
    const critical = tasks.filter((t) => t.priority === "CRITICAL" && t.status !== "COMPLETED").length;
    return { total, completed, inProgress, blocked, open, critical };
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

  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

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
  };

  return (
    <div>
      {/* KPI Cards + Progress Ring */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {/* Progress Ring */}
        <div className="col-span-2 lg:col-span-1 bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4 flex items-center justify-center">
          <ProgressRing percentage={progressPct} size={90} color="#22d3ee" label="Complete" />
        </div>

        {/* KPI cards */}
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>

        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{stats.inProgress}</div>
        </div>

        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Open</span>
          </div>
          <div className="text-2xl font-bold text-slate-300">{stats.open}</div>
        </div>

        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Blocked</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{stats.blocked}</div>
        </div>

        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Done</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
        </div>
      </div>

      {/* Status Distribution Bar */}
      <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Status Distribution</span>
          <span className="text-[10px] text-slate-600">{stats.total} deliverables</span>
        </div>
        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex bg-white/[0.03]">
          {statusDist.map(([s, count]) => (
            <div
              key={s}
              className={`${statusBarColors[s] || "bg-slate-600"} transition-all duration-500`}
              style={{ width: `${(count / stats.total) * 100}%` }}
              title={`${s}: ${count}`}
            />
          ))}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
          {statusDist.map(([s, count]) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-sm ${statusBarColors[s] || "bg-slate-600"}`} />
              <span className="text-[10px] text-slate-500">{s} ({count})</span>
            </div>
          ))}
        </div>
      </div>

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
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        >
          <option value="ALL" className="bg-[#0d1a2d]">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s} className="bg-[#0d1a2d]">{s}</option>
          ))}
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
              readOnly={readOnly}
            />
          ))
        )}
      </div>
    </div>
  );
}

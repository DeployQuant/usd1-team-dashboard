"use client";

import { useState, useMemo } from "react";
import TaskCard from "./TaskCard";

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

  const progressPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total Tasks</div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          <div className="text-xs text-gray-500 mt-0.5">In Progress</div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-600">{stats.open}</div>
          <div className="text-xs text-gray-500 mt-0.5">Open / Planned</div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{stats.blocked}</div>
          <div className="text-xs text-gray-500 mt-0.5">Blocked / Gated</div>
        </div>
        <div className="bg-white rounded-xl border p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-gray-500 mt-0.5">Completed</div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search tasks or owners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg">No tasks match your filters</p>
            <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
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

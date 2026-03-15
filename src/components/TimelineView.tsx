"use client";

import { useMemo } from "react";
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

// Parse a timeline string into a numeric "days" value for sorting
function parseDays(timeline: string): number {
  if (!timeline) return 999;
  const t = timeline.toLowerCase().trim();

  if (t === "immediate" || t === "days 1-7" || t === "0-7 days") return 1;
  if (t.startsWith("before ") || t === "day of approval" || t === "triggered") return 2;
  if (t.startsWith("at ")) return 3; // "At SDK launch"

  // Match patterns like "7 days", "Day 7", "0-14 days", "Days 7-14"
  const rangeMatch = t.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;

  const numMatch = t.match(/(\d+)/);
  if (numMatch) return parseInt(numMatch[1]);

  if (t === "ongoing") return 500;
  if (t.includes("post-")) return 200;

  return 999;
}

// Assign a timeframe bucket based on the parsed days
function getTimeframe(timeline: string): string {
  const days = parseDays(timeline);
  if (days <= 7) return "Immediate (0-7 days)";
  if (days <= 30) return "Short-term (8-30 days)";
  if (days <= 90) return "Medium-term (31-90 days)";
  if (days <= 180) return "Long-term (91-180 days)";
  return "Extended / Ongoing";
}

const TIMEFRAME_ORDER = [
  "Immediate (0-7 days)",
  "Short-term (8-30 days)",
  "Medium-term (31-90 days)",
  "Long-term (91-180 days)",
  "Extended / Ongoing",
];

const TIMEFRAME_COLORS: Record<string, string> = {
  "Immediate (0-7 days)": "border-l-red-500",
  "Short-term (8-30 days)": "border-l-amber-500",
  "Medium-term (31-90 days)": "border-l-cyan-500",
  "Long-term (91-180 days)": "border-l-indigo-500",
  "Extended / Ongoing": "border-l-slate-500",
};

const TIMEFRAME_DOT_COLORS: Record<string, string> = {
  "Immediate (0-7 days)": "bg-red-500",
  "Short-term (8-30 days)": "bg-amber-500",
  "Medium-term (31-90 days)": "bg-cyan-500",
  "Long-term (91-180 days)": "bg-indigo-500",
  "Extended / Ongoing": "bg-slate-500",
};

const PRIORITY_BAR_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-400",
  MEDIUM: "bg-yellow-400",
  LOW: "bg-slate-500",
};

const PRIORITY_BG_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/10 border-red-500/20",
  HIGH: "bg-orange-400/10 border-orange-500/20",
  MEDIUM: "bg-yellow-400/10 border-yellow-500/20",
  LOW: "bg-slate-500/10 border-slate-500/20",
};

function isDone(status: string) {
  return status === "COMPLETED" || status === "DONE";
}

function isActive(status: string) {
  return ["IN PROGRESS", "IN FLIGHT", "REVIEW"].includes(status);
}

function isBlocked(status: string) {
  return ["BLOCKED", "AUDIT-GATED", "PENDING AUDIT"].includes(status);
}

export default function TimelineView({ tasks }: { tasks: Task[] }) {
  const grouped = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    for (const tf of TIMEFRAME_ORDER) groups[tf] = [];
    tasks.forEach((t) => {
      const tf = getTimeframe(t.timeline);
      groups[tf].push(t);
    });
    // Sort tasks within each group by priority then parseDays
    const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    for (const tf of TIMEFRAME_ORDER) {
      groups[tf].sort((a, b) => {
        const pa = priorityOrder[a.priority] ?? 2;
        const pb = priorityOrder[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return parseDays(a.timeline) - parseDays(b.timeline);
      });
    }
    return groups;
  }, [tasks]);

  // Summary counts per timeframe
  const summaryStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; active: number; blocked: number }> = {};
    for (const tf of TIMEFRAME_ORDER) {
      const list = grouped[tf];
      stats[tf] = {
        total: list.length,
        done: list.filter((t) => isDone(t.status)).length,
        active: list.filter((t) => isActive(t.status)).length,
        blocked: list.filter((t) => isBlocked(t.status)).length,
      };
    }
    return stats;
  }, [grouped]);

  // Bar width scale: longest timeframe gets full width
  const maxCount = Math.max(...TIMEFRAME_ORDER.map((tf) => grouped[tf].length), 1);

  return (
    <div className="space-y-6">
      {/* Timeline summary bar */}
      <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Timeline Distribution</span>
          <span className="text-[10px] text-slate-600">{tasks.length} deliverables</span>
        </div>
        <div className="space-y-2">
          {TIMEFRAME_ORDER.map((tf) => {
            const count = grouped[tf].length;
            if (count === 0) return null;
            return (
              <div key={tf} className="flex items-center gap-3">
                <div className="w-40 flex-shrink-0">
                  <span className="text-[11px] text-slate-400">{tf.split(" (")[0]}</span>
                </div>
                <div className="flex-1 h-4 bg-white/[0.03] rounded overflow-hidden">
                  <div
                    className={`h-full rounded ${TIMEFRAME_DOT_COLORS[tf]} transition-all duration-500`}
                    style={{ width: `${(count / maxCount) * 100}%`, opacity: 0.7 }}
                  />
                </div>
                <span className="text-xs text-slate-400 font-mono w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gantt-style rows per timeframe */}
      {TIMEFRAME_ORDER.map((tf) => {
        const tasksInGroup = grouped[tf];
        if (tasksInGroup.length === 0) return null;
        const stats = summaryStats[tf];

        return (
          <div key={tf}>
            {/* Timeframe header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${TIMEFRAME_DOT_COLORS[tf]}`} />
              <h3 className="text-sm font-bold text-white">{tf}</h3>
              <div className="flex items-center gap-3 ml-auto">
                <span className="text-[10px] text-slate-600">{stats.total} tasks</span>
                {stats.active > 0 && <span className="text-[10px] text-cyan-500">{stats.active} active</span>}
                {stats.blocked > 0 && <span className="text-[10px] text-orange-400">{stats.blocked} blocked</span>}
                {stats.done > 0 && <span className="text-[10px] text-emerald-400">{stats.done} done</span>}
              </div>
            </div>

            {/* Task bars */}
            <div className="space-y-1.5">
              {tasksInGroup.map((task) => {
                const done = isDone(task.status);
                const active = isActive(task.status);
                const blocked = isBlocked(task.status);
                const barColor = PRIORITY_BAR_COLORS[task.priority] || PRIORITY_BAR_COLORS["MEDIUM"];
                const bgColor = PRIORITY_BG_COLORS[task.priority] || PRIORITY_BG_COLORS["MEDIUM"];

                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 bg-[#0d1a2d] border rounded-lg px-3 py-2.5 border-l-[3px] transition-all ${TIMEFRAME_COLORS[tf]} ${
                      done ? "opacity-40" : blocked ? "border-r border-r-orange-500/20" : "border-white/[0.04]"
                    }`}
                  >
                    {/* Priority bar indicator */}
                    <div className={`w-1 h-8 rounded-full flex-shrink-0 ${barColor} ${done ? "opacity-40" : ""}`} />

                    {/* Task info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm truncate ${done ? "text-slate-600 line-through" : active ? "text-white font-medium" : "text-slate-300"}`}>
                          {task.deliverable}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={task.status} />
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${bgColor}`}>
                          {task.priority}
                        </span>
                        {task.owner && task.owner !== "Unassigned" && (
                          <span className="text-[10px] text-slate-500">{task.owner}</span>
                        )}
                      </div>
                    </div>

                    {/* Timeline label */}
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] text-slate-500 font-mono">{task.timeline || "—"}</span>
                    </div>

                    {/* Gantt-style bar visual */}
                    <div className="w-24 flex-shrink-0 hidden md:block">
                      <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            done ? "bg-emerald-500" : blocked ? "bg-orange-400" : barColor
                          }`}
                          style={{
                            width: done ? "100%" : active ? "60%" : blocked ? "30%" : "15%",
                            opacity: done ? 0.4 : 1,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
        <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium block mb-2">Priority Legend</span>
        <div className="flex flex-wrap gap-4">
          {Object.entries(PRIORITY_BAR_COLORS).map(([p, color]) => (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`w-3 h-2 rounded-sm ${color}`} />
              <span className="text-[10px] text-slate-500">{p}</span>
            </div>
          ))}
          <div className="h-3 w-px bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-emerald-500 opacity-40" />
            <span className="text-[10px] text-slate-500">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-cyan-400" />
            <span className="text-[10px] text-slate-500">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-orange-400" />
            <span className="text-[10px] text-slate-500">Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Leadership timeline: shows all teams as swimlanes
export function LeadershipTimeline({
  teams,
}: {
  teams: { name: string; slug: string; pillar: string; tasks?: Task[] }[];
}) {
  const teamConfigs: Record<string, { gradient: string; letter: string }> = {
    engineering: { gradient: "from-cyan-500 to-blue-600", letter: "E" },
    bd: { gradient: "from-emerald-500 to-teal-600", letter: "B" },
    defi: { gradient: "from-violet-500 to-purple-600", letter: "D" },
    legal: { gradient: "from-rose-500 to-red-600", letter: "C" },
    marketing: { gradient: "from-orange-500 to-pink-600", letter: "M" },
  };

  return (
    <div className="space-y-8">
      {/* Overview bar */}
      <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Company Roadmap Timeline</span>
          <span className="text-[10px] text-slate-600">
            {teams.reduce((sum, t) => sum + (t.tasks?.length || 0), 0)} deliverables across {teams.length} teams
          </span>
        </div>
        {/* Column headers */}
        <div className="grid grid-cols-5 gap-1 mb-2">
          {TIMEFRAME_ORDER.map((tf) => (
            <div key={tf} className="text-center">
              <div className={`w-2 h-2 rounded-full ${TIMEFRAME_DOT_COLORS[tf]} mx-auto mb-1`} />
              <span className="text-[9px] text-slate-600 leading-tight block">{tf.split(" (")[0]}</span>
            </div>
          ))}
        </div>
        {/* Per-team row with stacked bar */}
        {teams.map((team) => {
          const allTasks = team.tasks || [];
          const counts = TIMEFRAME_ORDER.map((tf) =>
            allTasks.filter((t) => getTimeframe(t.timeline) === tf).length
          );
          const total = allTasks.length || 1;
          const config = teamConfigs[team.slug] || teamConfigs["engineering"];

          return (
            <div key={team.slug} className="flex items-center gap-3 mb-2">
              <div className="w-28 flex-shrink-0 flex items-center gap-2">
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${config.gradient} flex items-center justify-center text-[9px] font-bold text-white`}>
                  {config.letter}
                </div>
                <span className="text-[11px] text-slate-400 truncate">{team.name}</span>
              </div>
              <div className="flex-1 grid grid-cols-5 gap-1">
                {counts.map((count, i) => (
                  <div key={i} className="h-5 bg-white/[0.03] rounded overflow-hidden relative">
                    {count > 0 && (
                      <div
                        className={`h-full rounded ${TIMEFRAME_DOT_COLORS[TIMEFRAME_ORDER[i]]} transition-all duration-500`}
                        style={{ width: `${Math.max((count / total) * 100 * 5, 20)}%`, opacity: 0.6 }}
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/70">
                      {count > 0 ? count : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swimlanes per team */}
      {teams.map((team) => {
        const allTasks = team.tasks || [];
        if (allTasks.length === 0) return null;
        const config = teamConfigs[team.slug] || teamConfigs["engineering"];

        // Group tasks by timeframe
        const grouped: Record<string, Task[]> = {};
        for (const tf of TIMEFRAME_ORDER) grouped[tf] = [];
        allTasks.forEach((t) => {
          grouped[getTimeframe(t.timeline)].push(t);
        });
        // Sort by priority within
        const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        for (const tf of TIMEFRAME_ORDER) {
          grouped[tf].sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
        }

        const doneCount = allTasks.filter((t) => isDone(t.status)).length;
        const blockedCount = allTasks.filter((t) => isBlocked(t.status)).length;

        return (
          <div key={team.slug} className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
            {/* Team header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center text-xs font-bold text-white`}>
                {config.letter}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{team.name}</h3>
                <p className="text-[10px] text-slate-500">{team.pillar}</p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[10px] text-slate-600">{allTasks.length} tasks</span>
                {blockedCount > 0 && <span className="text-[10px] text-orange-400">{blockedCount} blocked</span>}
                <span className="text-[10px] text-emerald-400">{doneCount} done</span>
              </div>
            </div>

            {/* Compact Gantt rows grouped by timeframe */}
            {TIMEFRAME_ORDER.map((tf) => {
              const list = grouped[tf];
              if (list.length === 0) return null;

              return (
                <div key={tf} className="mb-3 last:mb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${TIMEFRAME_DOT_COLORS[tf]}`} />
                    <span className="text-[10px] text-slate-500 font-medium">{tf.split(" (")[0]}</span>
                    <span className="text-[10px] text-slate-600">({list.length})</span>
                  </div>
                  <div className="space-y-1 ml-3.5">
                    {list.map((task) => {
                      const done = isDone(task.status);
                      const active = isActive(task.status);
                      const blocked_ = isBlocked(task.status);
                      const barColor = PRIORITY_BAR_COLORS[task.priority] || PRIORITY_BAR_COLORS["MEDIUM"];

                      return (
                        <div
                          key={task.id}
                          className={`flex items-center gap-2 py-1.5 px-2 rounded-md border border-white/[0.03] ${
                            done ? "opacity-35" : ""
                          }`}
                        >
                          <div className={`w-1 h-5 rounded-full flex-shrink-0 ${barColor}`} />
                          <p className={`text-[11px] flex-1 min-w-0 truncate ${
                            done ? "text-slate-600 line-through" : active ? "text-white" : blocked_ ? "text-orange-300" : "text-slate-400"
                          }`}>
                            {task.deliverable}
                          </p>
                          <span className="text-[9px] text-slate-600 font-mono flex-shrink-0">{task.timeline}</span>
                          {/* Mini progress bar */}
                          <div className="w-12 h-1.5 bg-white/[0.04] rounded-full overflow-hidden flex-shrink-0 hidden sm:block">
                            <div
                              className={`h-full rounded-full ${
                                done ? "bg-emerald-500" : blocked_ ? "bg-orange-400" : barColor
                              }`}
                              style={{
                                width: done ? "100%" : active ? "60%" : blocked_ ? "30%" : "15%",
                                opacity: done ? 0.5 : 1,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Legend */}
      <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
        <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium block mb-2">Priority Legend</span>
        <div className="flex flex-wrap gap-4">
          {Object.entries(PRIORITY_BAR_COLORS).map(([p, color]) => (
            <div key={p} className="flex items-center gap-1.5">
              <div className={`w-3 h-2 rounded-sm ${color}`} />
              <span className="text-[10px] text-slate-500">{p}</span>
            </div>
          ))}
          <div className="h-3 w-px bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-emerald-500 opacity-40" />
            <span className="text-[10px] text-slate-500">Done (faded)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 rounded-sm bg-orange-400" />
            <span className="text-[10px] text-slate-500">Blocked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

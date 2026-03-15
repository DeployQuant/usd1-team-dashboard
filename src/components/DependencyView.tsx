"use client";

import { useState, useEffect, useMemo } from "react";

interface Team {
  id: number;
  name: string;
  slug: string;
  pillar: string;
  tasks?: any[];
}

interface DeptDependency {
  id: number;
  task_id: number;
  depends_on_team_slug: string;
  note: string;
  created_at: string;
  task_deliverable: string;
  task_status: string;
  task_priority: string;
  task_team_name: string;
  task_team_slug: string;
  dep_team_name: string;
}

const teamColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  engineering: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", gradient: "from-cyan-500 to-blue-600" },
  bd: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", gradient: "from-emerald-500 to-teal-600" },
  defi: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", gradient: "from-violet-500 to-purple-600" },
  legal: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", gradient: "from-rose-500 to-red-600" },
  marketing: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", gradient: "from-orange-500 to-pink-600" },
};

export default function DependencyView({ teams }: { teams: Team[] }) {
  const [dependencies, setDependencies] = useState<DeptDependency[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchDeps() {
    try {
      const res = await fetch("/api/dependencies");
      if (res.ok) {
        const data = await res.json();
        setDependencies(data.dependencies || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDeps();
  }, []);

  // Department-to-department flow summary
  const deptFlows = useMemo(() => {
    const flows: Record<string, { from: string; fromSlug: string; to: string; toSlug: string; count: number; tasks: { deliverable: string; status: string; priority: string; note: string }[] }> = {};
    dependencies.forEach((d) => {
      const key = `${d.task_team_slug}->${d.depends_on_team_slug}`;
      if (!flows[key]) {
        flows[key] = {
          from: d.task_team_name,
          fromSlug: d.task_team_slug,
          to: d.dep_team_name,
          toSlug: d.depends_on_team_slug,
          count: 0,
          tasks: [],
        };
      }
      flows[key].count++;
      flows[key].tasks.push({
        deliverable: d.task_deliverable,
        status: d.task_status,
        priority: d.task_priority,
        note: d.note,
      });
    });
    return Object.values(flows).sort((a, b) => b.count - a.count);
  }, [dependencies]);

  // Bottleneck analysis: which teams are most depended upon
  const bottlenecks = useMemo(() => {
    const counts: Record<string, { slug: string; name: string; incomingCount: number; fromTeams: Set<string> }> = {};
    dependencies.forEach((d) => {
      if (!counts[d.depends_on_team_slug]) {
        counts[d.depends_on_team_slug] = {
          slug: d.depends_on_team_slug,
          name: d.dep_team_name,
          incomingCount: 0,
          fromTeams: new Set(),
        };
      }
      counts[d.depends_on_team_slug].incomingCount++;
      counts[d.depends_on_team_slug].fromTeams.add(d.task_team_slug);
    });
    return Object.values(counts)
      .map((b) => ({ ...b, fromTeamCount: b.fromTeams.size }))
      .sort((a, b) => b.incomingCount - a.incomingCount);
  }, [dependencies]);

  // Outgoing: which teams depend on the most others
  const outgoing = useMemo(() => {
    const counts: Record<string, { slug: string; name: string; outCount: number; toTeams: Set<string> }> = {};
    dependencies.forEach((d) => {
      if (!counts[d.task_team_slug]) {
        counts[d.task_team_slug] = {
          slug: d.task_team_slug,
          name: d.task_team_name,
          outCount: 0,
          toTeams: new Set(),
        };
      }
      counts[d.task_team_slug].outCount++;
      counts[d.task_team_slug].toTeams.add(d.depends_on_team_slug);
    });
    return Object.values(counts).sort((a, b) => b.outCount - a.outCount);
  }, [dependencies]);

  // Group all dependencies by the team being depended upon (for the detailed list)
  const groupedByDepTeam = useMemo(() => {
    const groups: Record<string, { slug: string; name: string; deps: DeptDependency[] }> = {};
    dependencies.forEach((d) => {
      if (!groups[d.depends_on_team_slug]) {
        groups[d.depends_on_team_slug] = {
          slug: d.depends_on_team_slug,
          name: d.dep_team_name,
          deps: [],
        };
      }
      groups[d.depends_on_team_slug].deps.push(d);
    });
    // Sort groups by number of deps descending (biggest bottleneck first)
    return Object.values(groups).sort((a, b) => b.deps.length - a.deps.length);
  }, [dependencies]);

  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 mt-4 text-sm">Loading dependencies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Total Dependencies</div>
          <div className="text-2xl font-bold text-white">{dependencies.length}</div>
        </div>
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-cyan-500 uppercase tracking-wider font-medium mb-1">Dept Flows</div>
          <div className="text-2xl font-bold text-cyan-400">{deptFlows.length}</div>
        </div>
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-orange-500 uppercase tracking-wider font-medium mb-1">Most Depended</div>
          <div className="text-lg font-bold text-orange-400 truncate">{bottlenecks[0]?.name || "None"}</div>
          {bottlenecks[0] && (
            <div className="text-[10px] text-slate-600 mt-0.5">{bottlenecks[0].incomingCount} tasks from {bottlenecks[0].fromTeamCount} team{bottlenecks[0].fromTeamCount !== 1 ? "s" : ""}</div>
          )}
        </div>
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-violet-500 uppercase tracking-wider font-medium mb-1">Most Dependent</div>
          <div className="text-lg font-bold text-violet-400 truncate">{outgoing[0]?.name || "None"}</div>
          {outgoing[0] && (
            <div className="text-[10px] text-slate-600 mt-0.5">{outgoing[0].outCount} tasks depend on {outgoing[0].toTeams.size} team{outgoing[0].toTeams.size !== 1 ? "s" : ""}</div>
          )}
        </div>
      </div>

      {/* Bottleneck Analysis */}
      {bottlenecks.length > 0 && (
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-4">Bottleneck Analysis — Most Depended-Upon Departments</h3>
          <div className="space-y-2">
            {bottlenecks.map((b) => {
              const colors = teamColors[b.slug] || teamColors["engineering"];
              const maxCount = bottlenecks[0]?.incomingCount || 1;
              const barWidth = Math.max(10, (b.incomingCount / maxCount) * 100);
              return (
                <div key={b.slug} className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-lg ${colors.bg} ${colors.text} text-xs font-semibold min-w-[140px] text-center border ${colors.border}`}>
                    {b.name}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 rounded-md overflow-hidden bg-white/[0.03] relative">
                      <div
                        className={`h-full bg-gradient-to-r ${colors.gradient} rounded-md transition-all duration-500 opacity-30`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-3 text-[11px] font-mono text-slate-300">
                        {b.incomingCount} task{b.incomingCount !== 1 ? "s" : ""} from {b.fromTeamCount} department{b.fromTeamCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department-to-Department Flow Map */}
      {deptFlows.length > 0 ? (
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-4">Department Dependency Flows</h3>
          <div className="space-y-2">
            {deptFlows.map((flow) => {
              const fromColors = teamColors[flow.fromSlug] || teamColors["engineering"];
              const toColors = teamColors[flow.toSlug] || teamColors["engineering"];
              const flowKey = `${flow.fromSlug}->${flow.toSlug}`;
              const isExpanded = expandedFlow === flowKey;
              return (
                <div key={flowKey}>
                  <button
                    onClick={() => setExpandedFlow(isExpanded ? null : flowKey)}
                    className="w-full flex items-center gap-3 hover:bg-white/[0.02] rounded-lg p-1 transition-colors"
                  >
                    <div className={`px-3 py-1.5 rounded-lg ${fromColors.bg} ${fromColors.text} text-xs font-semibold min-w-[120px] text-center border ${fromColors.border}`}>
                      {flow.from}
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="h-px flex-1 bg-white/[0.08]" />
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded text-slate-500 bg-white/[0.03]">
                        depends on ({flow.count})
                      </span>
                      <div className="h-px flex-1 bg-white/[0.08]" />
                      <svg className="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg ${toColors.bg} ${toColors.text} text-xs font-semibold min-w-[120px] text-center border ${toColors.border}`}>
                      {flow.to}
                    </div>
                    <svg
                      className={`w-3.5 h-3.5 text-slate-600 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded task list */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 pl-4 border-l-2 border-white/[0.06]">
                      {flow.tasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-white/[0.02] border border-white/[0.04]">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            t.priority === "CRITICAL" ? "text-red-400 bg-red-500/10" :
                            t.priority === "HIGH" ? "text-amber-400 bg-amber-500/10" :
                            "text-slate-400 bg-slate-500/10"
                          }`}>
                            {t.priority}
                          </span>
                          <span className="text-slate-300 truncate flex-1">{t.deliverable}</span>
                          <span className="text-[9px] text-slate-600 flex-shrink-0">{t.status}</span>
                          {t.note && (
                            <span className="text-[9px] text-slate-500 italic flex-shrink-0 max-w-[150px] truncate">{t.note}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5">
          <div className="text-center py-8">
            <svg className="w-8 h-8 text-slate-700 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <p className="text-slate-600 text-xs">No department dependencies configured yet.</p>
            <p className="text-slate-700 text-[10px] mt-1">Teams can add dependencies from their task cards.</p>
          </div>
        </div>
      )}

      {/* Cross-Team Dependencies — detailed list grouped by depended-upon team */}
      {groupedByDepTeam.length > 0 && (
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-4">
            Cross-Team Dependencies — Who Is Waiting on Whom
          </h3>
          <div className="space-y-5">
            {groupedByDepTeam.map((group) => {
              const colors = teamColors[group.slug] || teamColors["engineering"];
              const urgentCount = group.deps.filter(
                (d) => d.task_priority === "CRITICAL" || d.task_status === "BLOCKED"
              ).length;
              return (
                <div key={group.slug}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`px-3 py-1 rounded-lg ${colors.bg} ${colors.text} text-xs font-semibold border ${colors.border}`}>
                      {group.name}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {group.deps.length} team{group.deps.length !== 1 ? "s" : ""} waiting
                    </span>
                    {urgentCount > 0 && (
                      <span className="text-[9px] text-red-400 font-semibold px-1.5 py-0.5 bg-red-500/10 rounded">
                        {urgentCount} URGENT
                      </span>
                    )}
                  </div>
                  {/* Individual dependency rows */}
                  <div className="space-y-1 ml-2 pl-3 border-l-2 border-white/[0.06]">
                    {group.deps.map((d) => {
                      const isUrgent = d.task_priority === "CRITICAL" || d.task_status === "BLOCKED";
                      const fromColors = teamColors[d.task_team_slug] || teamColors["engineering"];
                      return (
                        <div
                          key={d.id}
                          className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${
                            isUrgent
                              ? "bg-red-500/5 border-red-500/15"
                              : "bg-white/[0.02] border-white/[0.04]"
                          }`}
                        >
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex-shrink-0 mt-0.5 ${
                            d.task_priority === "CRITICAL" ? "text-red-400 bg-red-500/10" :
                            d.task_priority === "HIGH" ? "text-amber-400 bg-amber-500/10" :
                            "text-slate-400 bg-slate-500/10"
                          }`}>
                            {d.task_priority}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] ${isUrgent ? "text-red-300" : "text-slate-300"}`}>
                              <span className={`font-semibold ${fromColors.text}`}>{d.task_team_name}</span>
                              <span className="text-slate-600 mx-1">is waiting on</span>
                              <span className={`font-semibold ${colors.text}`}>{group.name}</span>
                              <span className="text-slate-600 mx-1">for</span>
                              <span className="font-medium">{d.task_deliverable}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] text-slate-600">{d.task_status}</span>
                              {d.note && (
                                <span className="text-[9px] text-slate-500 italic">
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

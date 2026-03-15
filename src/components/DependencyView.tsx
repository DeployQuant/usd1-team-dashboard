"use client";

import { useState, useEffect, useMemo } from "react";
import StatusBadge from "./StatusBadge";

interface Team {
  id: number;
  name: string;
  slug: string;
  pillar: string;
  tasks?: any[];
}

interface Dependency {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  task_deliverable: string;
  task_status: string;
  task_priority: string;
  task_team_id: number;
  task_team_name: string;
  task_team_slug: string;
  dep_deliverable: string;
  dep_status: string;
  dep_priority: string;
  dep_team_id: number;
  dep_team_name: string;
  dep_team_slug: string;
}

const teamColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  engineering: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", gradient: "from-cyan-500 to-blue-600" },
  bd: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", gradient: "from-emerald-500 to-teal-600" },
  defi: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20", gradient: "from-violet-500 to-purple-600" },
  legal: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", gradient: "from-rose-500 to-red-600" },
  marketing: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", gradient: "from-orange-500 to-pink-600" },
};

function isRisk(status: string) {
  return !["COMPLETED", "DONE"].includes(status);
}

function isBlocked(status: string) {
  return ["BLOCKED", "AUDIT-GATED", "PENDING AUDIT"].includes(status);
}

export default function DependencyView({ teams }: { teams: Team[] }) {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [depTaskId, setDepTaskId] = useState("");
  const [saving, setSaving] = useState(false);

  // Flatten all tasks for the add form
  const allTasks = useMemo(() => {
    const result: { id: number; deliverable: string; team_name: string; team_slug: string; status: string }[] = [];
    teams.forEach((team) => {
      (team.tasks || []).forEach((t: any) => {
        result.push({
          id: t.id,
          deliverable: t.deliverable,
          team_name: team.name,
          team_slug: team.slug,
          status: t.status,
        });
      });
    });
    return result;
  }, [teams]);

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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId || !depTaskId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dependencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: Number(taskId), depends_on_task_id: Number(depTaskId) }),
      });
      if (res.ok) {
        await fetchDeps();
        setTaskId("");
        setDepTaskId("");
        setShowAddForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(dep: Dependency) {
    await fetch("/api/dependencies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: dep.task_id, depends_on_task_id: dep.depends_on_task_id }),
    });
    await fetchDeps();
  }

  // Build cross-team link summary
  const crossTeamLinks = useMemo(() => {
    const links: Record<string, { from: string; to: string; count: number; risks: number }> = {};
    dependencies.forEach((d) => {
      if (d.task_team_slug !== d.dep_team_slug) {
        const key = `${d.task_team_slug}->${d.dep_team_slug}`;
        if (!links[key]) {
          links[key] = { from: d.task_team_name, to: d.dep_team_name, count: 0, risks: 0 };
        }
        links[key].count++;
        if (isRisk(d.dep_status)) links[key].risks++;
      }
    });
    return Object.values(links);
  }, [dependencies]);

  // Risks: dependencies where the depended-on task is not done
  const riskDeps = useMemo(() => {
    return dependencies.filter((d) => isRisk(d.dep_status));
  }, [dependencies]);

  const blockerDeps = useMemo(() => {
    return dependencies.filter((d) => isBlocked(d.dep_status));
  }, [dependencies]);

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
          <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Total Links</div>
          <div className="text-2xl font-bold text-white">{dependencies.length}</div>
        </div>
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-cyan-500 uppercase tracking-wider font-medium mb-1">Cross-Team</div>
          <div className="text-2xl font-bold text-cyan-400">{crossTeamLinks.length}</div>
        </div>
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-orange-500 uppercase tracking-wider font-medium mb-1">At Risk</div>
          <div className="text-2xl font-bold text-orange-400">{riskDeps.length}</div>
        </div>
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
          <div className="text-[10px] text-red-500 uppercase tracking-wider font-medium mb-1">Cascading Blockers</div>
          <div className="text-2xl font-bold text-red-400">{blockerDeps.length}</div>
        </div>
      </div>

      {/* Cross-team dependency map */}
      {crossTeamLinks.length > 0 && (
        <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-4">Cross-Team Dependency Map</h3>
          <div className="space-y-2">
            {crossTeamLinks.map((link, i) => {
              const fromColors = teamColors[teams.find((t) => t.name === link.from)?.slug || ""] || teamColors["engineering"];
              const toColors = teamColors[teams.find((t) => t.name === link.to)?.slug || ""] || teamColors["engineering"];
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`px-3 py-1.5 rounded-lg ${fromColors.bg} ${fromColors.text} text-xs font-semibold min-w-[120px] text-center border ${fromColors.border}`}>
                    {link.from}
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <div className="h-px flex-1 bg-white/[0.08]" />
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      link.risks > 0 ? "text-red-400 bg-red-500/10" : "text-slate-500 bg-white/[0.03]"
                    }`}>
                      depends on ({link.count}) {link.risks > 0 && `⚠ ${link.risks} at risk`}
                    </span>
                    <div className="h-px flex-1 bg-white/[0.08]" />
                    <svg className="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg ${toColors.bg} ${toColors.text} text-xs font-semibold min-w-[120px] text-center border ${toColors.border}`}>
                    {link.to}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cascading blockers alert */}
      {blockerDeps.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Cascading Blockers — {blockerDeps.length} Dependencies at Critical Risk
            </h3>
          </div>
          <div className="space-y-2">
            {blockerDeps.map((d) => (
              <div key={d.id} className="flex items-center gap-3 bg-red-500/5 rounded-lg px-3 py-2 border border-red-500/10">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{d.task_deliverable}</p>
                  <p className="text-[10px] text-slate-500">{d.task_team_name}</p>
                </div>
                <div className="flex-shrink-0 text-[10px] text-red-400 font-mono">blocked by →</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={d.dep_status} />
                    <p className="text-xs text-red-300 truncate">{d.dep_deliverable}</p>
                  </div>
                  <p className="text-[10px] text-slate-500">{d.dep_team_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add dependency button + form */}
      <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Manage Dependencies</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {showAddForm ? "CANCEL" : "ADD DEPENDENCY"}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="space-y-3 mb-4 bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">
                Task (depends on something)
              </label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                <option value="" className="bg-[#0d1a2d]">Select task...</option>
                {allTasks.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#0d1a2d]">
                    [{t.team_name}] {t.deliverable.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-slate-600 font-mono">depends on ↓</span>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-medium block mb-1.5">
                Dependency (must be completed first)
              </label>
              <select
                value={depTaskId}
                onChange={(e) => setDepTaskId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              >
                <option value="" className="bg-[#0d1a2d]">Select dependency...</option>
                {allTasks
                  .filter((t) => String(t.id) !== taskId)
                  .map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#0d1a2d]">
                      [{t.team_name}] {t.deliverable.slice(0, 60)}
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={saving || !taskId || !depTaskId}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 tracking-wide"
            >
              {saving ? "SAVING..." : "CREATE LINK"}
            </button>
          </form>
        )}

        {/* All dependencies list */}
        {dependencies.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-8 h-8 text-slate-700 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
            <p className="text-slate-600 text-xs">No dependencies configured yet.</p>
            <p className="text-slate-700 text-[10px] mt-1">Click "Add Dependency" to link tasks across teams.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {dependencies.map((d) => {
              const depIsRisk = isRisk(d.dep_status);
              const depIsBlocked = isBlocked(d.dep_status);
              return (
                <div key={d.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  depIsBlocked ? "bg-red-500/5 border-red-500/15" :
                  depIsRisk ? "bg-orange-500/5 border-orange-500/10" :
                  "bg-white/[0.02] border-white/[0.04]"
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={d.task_status} />
                      <span className="text-[11px] text-slate-300 truncate">{d.task_deliverable}</span>
                    </div>
                    <span className="text-[9px] text-slate-600">{d.task_team_name}</span>
                  </div>
                  <div className="flex-shrink-0 text-[9px] text-slate-600 font-mono">→</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={d.dep_status} />
                      <span className={`text-[11px] truncate ${depIsBlocked ? "text-red-300" : depIsRisk ? "text-orange-300" : "text-emerald-300"}`}>
                        {d.dep_deliverable}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-600">{d.dep_team_name}</span>
                  </div>
                  {depIsBlocked && (
                    <span className="text-[9px] text-red-400 font-semibold flex-shrink-0 px-1.5 py-0.5 bg-red-500/10 rounded">BLOCKER</span>
                  )}
                  {depIsRisk && !depIsBlocked && (
                    <span className="text-[9px] text-orange-400 font-semibold flex-shrink-0 px-1.5 py-0.5 bg-orange-500/10 rounded">AT RISK</span>
                  )}
                  {!depIsRisk && (
                    <span className="text-[9px] text-emerald-400 font-semibold flex-shrink-0 px-1.5 py-0.5 bg-emerald-500/10 rounded">CLEAR</span>
                  )}
                  <button
                    onClick={() => handleRemove(d)}
                    className="text-slate-700 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Remove dependency"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

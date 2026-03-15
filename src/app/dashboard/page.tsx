"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import TeamDashboard from "@/components/TeamDashboard";
import ProgressRing from "@/components/ProgressRing";
import { LeadershipTimeline } from "@/components/TimelineView";
import DependencyView from "@/components/DependencyView";

interface TeamInfo {
  id: number;
  slug: string;
  name: string;
}

interface UserSession {
  id: number;
  name: string;
  teams: TeamInfo[];
  activeTeam: TeamInfo;
  mustChangePassword: boolean;
}

interface Team {
  id: number;
  name: string;
  slug: string;
  pillar: string;
  description: string;
  tasks?: any[];
}

const teamConfig: Record<string, { gradient: string; icon: string; ringColor: string; letter: string }> = {
  engineering: { gradient: "from-cyan-500 to-blue-600", icon: "E", ringColor: "#22d3ee", letter: "E" },
  bd: { gradient: "from-emerald-500 to-teal-600", icon: "B", ringColor: "#34d399", letter: "B" },
  defi: { gradient: "from-violet-500 to-purple-600", icon: "D", ringColor: "#a78bfa", letter: "D" },
  legal: { gradient: "from-rose-500 to-red-600", icon: "C", ringColor: "#fb7185", letter: "C" },
  marketing: { gradient: "from-orange-500 to-pink-600", icon: "M", ringColor: "#fb923c", letter: "M" },
};

function getHealthColor(pct: number, blocked: number, critical: number) {
  if (blocked > 3 || critical > 4) return { color: "bg-red-500", label: "At Risk", glow: "shadow-red-500/30" };
  if (pct < 10 && blocked > 0) return { color: "bg-amber-500", label: "Needs Attention", glow: "shadow-amber-500/30" };
  if (pct >= 50) return { color: "bg-emerald-500", label: "On Track", glow: "shadow-emerald-500/30" };
  return { color: "bg-amber-500", label: "In Progress", glow: "shadow-amber-500/30" };
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [activeTeamTab, setActiveTeamTab] = useState<string>("overview");
  const [leadershipView, setLeadershipView] = useState<"overview" | "timeline" | "dependencies">("overview");
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async (teamSlug: string) => {
    if (teamSlug === "leadership") {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setAllTeams(data.teams || []);
      }
    } else {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    }
  }, []);

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (data.user.mustChangePassword) {
        router.push("/set-password");
        return;
      }
      setUser(data.user);
      await fetchData(data.user.activeTeam.slug);
      setLoading(false);
    }
    init();
  }, [router, fetchData]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function switchTeam(teamSlug: string) {
    const res = await fetch("/api/auth/switch-team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamSlug }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser((prev) => prev ? { ...prev, activeTeam: data.activeTeam } : null);
      setShowTeamSwitcher(false);
      setTasks([]);
      setAllTeams([]);
      setActiveTeamTab("overview");
      await fetchData(teamSlug);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040a18]">
        <div className="text-center">
          <div className="w-14 h-14 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 mt-5 text-sm tracking-wide">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isLeadership = user.activeTeam.slug === "leadership";
  const hasMultipleTeams = user.teams.length > 1;

  const leadershipOverview = isLeadership
    ? allTeams.map((team) => {
        const t = team.tasks || [];
        const total = t.length;
        const completed = t.filter((x: any) => x.status === "COMPLETED" || x.status === "DONE").length;
        const inProgress = t.filter((x: any) => ["IN PROGRESS", "IN FLIGHT", "REVIEW"].includes(x.status)).length;
        const blocked = t.filter((x: any) => ["BLOCKED", "AUDIT-GATED"].includes(x.status)).length;
        const critical = t.filter((x: any) => x.priority === "CRITICAL" && x.status !== "COMPLETED").length;
        const open = t.filter((x: any) => x.status === "OPEN" || x.status === "PLANNED").length;
        return { ...team, total, completed, inProgress, blocked, critical, open };
      })
    : [];

  const totalAll = leadershipOverview.reduce((a, b) => a + b.total, 0);
  const completedAll = leadershipOverview.reduce((a, b) => a + b.completed, 0);
  const inProgressAll = leadershipOverview.reduce((a, b) => a + b.inProgress, 0);
  const blockedAll = leadershipOverview.reduce((a, b) => a + b.blocked, 0);
  const criticalAll = leadershipOverview.reduce((a, b) => a + b.critical, 0);
  const overallPct = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#040a18]">
      {/* Header */}
      <header className="bg-[#0a1628]/90 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/15">
                <span className="text-xs font-extrabold text-white">U1</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-bold text-white">World Liberty Financial</h1>
                  <div className="h-3 w-px bg-white/10" />
                  <span className="text-[10px] text-cyan-400 font-semibold tracking-widest uppercase">USD1</span>
                </div>
                <p className="text-[11px] text-slate-500">{user.activeTeam.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Team Switcher */}
              {hasMultipleTeams && (
                <div className="relative">
                  <button
                    onClick={() => setShowTeamSwitcher(!showTeamSwitcher)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/10 transition-all font-medium"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    Switch Team
                  </button>
                  {showTeamSwitcher && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#0d1a2d] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50">
                      {user.teams.map((t) => (
                        <button
                          key={t.slug}
                          onClick={() => switchTeam(t.slug)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-all ${
                            t.slug === user.activeTeam.slug
                              ? "bg-cyan-500/10 text-cyan-400 font-semibold"
                              : "text-slate-300 hover:bg-white/[0.04]"
                          }`}
                        >
                          {t.name}
                          {t.slug === user.activeTeam.slug && (
                            <span className="ml-2 text-[10px] text-cyan-500">ACTIVE</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Admin Link (Leadership only) */}
              {isLeadership && (
                <button
                  onClick={() => router.push("/dashboard/admin")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/10 transition-all font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Admin
                </button>
              )}

              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Signed in as</p>
                <p className="text-xs font-semibold text-slate-300">{user.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white border border-white/[0.08] rounded-lg hover:bg-white/[0.04] transition-all font-medium tracking-wide"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLeadership ? (
          <>
            {activeTeamTab === "overview" && (
              <>
                {/* Hero Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    <span className="text-[10px] text-amber-400 font-semibold tracking-[0.2em] uppercase">Executive Command</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">Strategic Operations Overview</h2>
                  <p className="text-sm text-slate-500 mt-1">USD1 Strategic Dominance Roadmap — All Pillars</p>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 mb-6 bg-[#0d1a2d] border border-white/[0.04] rounded-lg p-1 w-fit">
                  <button
                    onClick={() => setLeadershipView("overview")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                      leadershipView === "overview"
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    Overview
                  </button>
                  <button
                    onClick={() => setLeadershipView("timeline")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                      leadershipView === "timeline"
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    Timeline
                  </button>
                  <button
                    onClick={() => setLeadershipView("dependencies")}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
                      leadershipView === "dependencies"
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    Dependencies
                  </button>
                </div>

                {leadershipView === "timeline" ? (
                  <LeadershipTimeline teams={allTeams} />
                ) : leadershipView === "dependencies" ? (
                  <DependencyView teams={allTeams} />
                ) : (
                <>
                {/* Global Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
                  <div className="col-span-2 md:col-span-1 bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4 flex items-center justify-center gold-glow">
                    <ProgressRing percentage={overallPct} size={90} color="#d4a843" label="Overall" />
                  </div>
                  <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Total</div>
                    <div className="text-3xl font-bold text-white">{totalAll}</div>
                    <div className="text-[10px] text-slate-600 mt-1">Deliverables</div>
                  </div>
                  <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
                    <div className="text-[10px] text-cyan-500 uppercase tracking-wider font-medium mb-1">Active</div>
                    <div className="text-3xl font-bold text-cyan-400">{inProgressAll}</div>
                    <div className="text-[10px] text-slate-600 mt-1">In Progress</div>
                  </div>
                  <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
                    <div className="text-[10px] text-emerald-500 uppercase tracking-wider font-medium mb-1">Done</div>
                    <div className="text-3xl font-bold text-emerald-400">{completedAll}</div>
                    <div className="text-[10px] text-slate-600 mt-1">Completed</div>
                  </div>
                  <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
                    <div className="text-[10px] text-orange-500 uppercase tracking-wider font-medium mb-1">Blocked</div>
                    <div className="text-3xl font-bold text-orange-400">{blockedAll}</div>
                    <div className="text-[10px] text-slate-600 mt-1">Gated / Stuck</div>
                  </div>
                  <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-4">
                    <div className="text-[10px] text-red-500 uppercase tracking-wider font-medium mb-1">Critical</div>
                    <div className="text-3xl font-bold text-red-400">{criticalAll}</div>
                    <div className="text-[10px] text-slate-600 mt-1">Open / Urgent</div>
                  </div>
                </div>

                {/* Team Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leadershipOverview.map((team) => {
                    const pct = team.total > 0 ? Math.round((team.completed / team.total) * 100) : 0;
                    const config = teamConfig[team.slug] || teamConfig["engineering"];
                    const health = getHealthColor(pct, team.blocked, team.critical);

                    return (
                      <button
                        key={team.slug}
                        onClick={() => setActiveTeamTab(team.slug)}
                        className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl p-5 hover:border-white/[0.1] transition-all duration-300 text-left group glow-border"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-sm font-bold text-white shadow-lg`}>
                              {config.letter}
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">{team.name}</h3>
                              <p className="text-[10px] text-slate-500">{team.pillar}</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${health.color}/10`}>
                            <div className={`w-2 h-2 rounded-full ${health.color} health-pulse shadow-sm ${health.glow}`} />
                            <span className={`text-[9px] font-semibold tracking-wider uppercase ${health.color.replace('bg-', 'text-')}`}>
                              {health.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                          <ProgressRing percentage={pct} size={64} strokeWidth={5} color={config.ringColor} />
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 flex-1">
                            <div>
                              <div className="text-lg font-bold text-white">{team.total}</div>
                              <div className="text-[9px] text-slate-600 uppercase tracking-wider">Total</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-cyan-400">{team.inProgress}</div>
                              <div className="text-[9px] text-slate-600 uppercase tracking-wider">Active</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-400">{team.blocked}</div>
                              <div className="text-[9px] text-slate-600 uppercase tracking-wider">Blocked</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-red-400">{team.critical}</div>
                              <div className="text-[9px] text-slate-600 uppercase tracking-wider">Critical</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${config.gradient} rounded-full transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
                        </div>

                        <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-600 group-hover:text-cyan-400 transition-colors">
                          <span className="uppercase tracking-wider font-medium">View Details</span>
                          <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
                </>
                )}
              </>
            )}

            {/* Team Drill-down */}
            {activeTeamTab !== "overview" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setActiveTeamTab("overview")}
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    ALL TEAMS
                  </button>
                  <div className="h-4 w-px bg-white/[0.08]" />
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${teamConfig[activeTeamTab]?.gradient || "from-gray-500 to-gray-600"} flex items-center justify-center text-xs font-bold text-white`}>
                    {teamConfig[activeTeamTab]?.letter || "?"}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {allTeams.find((t) => t.slug === activeTeamTab)?.name}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-600 hidden sm:inline">
                    {allTeams.find((t) => t.slug === activeTeamTab)?.pillar}
                  </span>
                </div>
                <TeamDashboard
                  tasks={allTeams.find((t) => t.slug === activeTeamTab)?.tasks || []}
                  teamName={allTeams.find((t) => t.slug === activeTeamTab)?.name || ""}
                  teamSlug={activeTeamTab}
                  pillar={allTeams.find((t) => t.slug === activeTeamTab)?.pillar || ""}
                  readOnly={false}
                  onRefresh={() => fetchData("leadership")}
                />
              </>
            )}

            {/* Mobile Tab Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0a1628]/95 backdrop-blur-xl border-t border-white/[0.04] py-2 px-4 md:hidden z-50">
              <div className="flex justify-around">
                <button
                  onClick={() => setActiveTeamTab("overview")}
                  className={`text-[10px] flex flex-col items-center gap-0.5 font-medium ${activeTeamTab === "overview" ? "text-amber-400" : "text-slate-600"}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  <span>Overview</span>
                </button>
                {allTeams.map((team) => {
                  const config = teamConfig[team.slug];
                  return (
                    <button
                      key={team.slug}
                      onClick={() => setActiveTeamTab(team.slug)}
                      className={`text-[10px] flex flex-col items-center gap-0.5 font-medium ${activeTeamTab === team.slug ? "text-cyan-400" : "text-slate-600"}`}
                    >
                      <span className="text-sm">{config?.letter || "?"}</span>
                      <span className="truncate max-w-[3rem]">{team.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Regular Team Dashboard */
          <>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${teamConfig[user.activeTeam.slug]?.gradient || "from-cyan-500 to-blue-600"}`} />
                <span className="text-[10px] text-cyan-400 font-semibold tracking-[0.2em] uppercase">{user.activeTeam.name}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{user.activeTeam.name} Dashboard</h2>
            </div>
            <TeamDashboard
              tasks={tasks}
              teamName={user.activeTeam.name}
              teamSlug={user.activeTeam.slug}
              pillar=""
              onRefresh={() => fetchData(user.activeTeam.slug)}
            />
          </>
        )}
      </main>
    </div>
  );
}

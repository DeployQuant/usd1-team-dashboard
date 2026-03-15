"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import TeamDashboard from "@/components/TeamDashboard";

interface Team {
  id: number;
  name: string;
  slug: string;
  pillar: string;
  description: string;
  tasks?: any[];
}

const teamColors: Record<string, string> = {
  engineering: "from-blue-600 to-cyan-700",
  bd: "from-emerald-600 to-teal-700",
  defi: "from-orange-600 to-amber-700",
  legal: "from-red-600 to-rose-700",
  marketing: "from-pink-600 to-fuchsia-700",
};

const teamIcons: Record<string, string> = {
  engineering: "⚙",
  bd: "🤝",
  defi: "📊",
  legal: "⚖",
  marketing: "📣",
};

export default function DashboardPage() {
  const [session, setSession] = useState<{ team: Team } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [activeTeamTab, setActiveTeamTab] = useState<string>("overview");
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
      setSession({ team: data.team });
      await fetchData(data.team.slug);
      setLoading(false);
    }
    init();
  }, [router, fetchData]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isLeadership = session.team.slug === "leadership";

  // Leadership Overview Stats
  const leadershipOverview = isLeadership
    ? allTeams.map((team) => {
        const t = team.tasks || [];
        const total = t.length;
        const completed = t.filter((x: any) => x.status === "COMPLETED" || x.status === "DONE").length;
        const inProgress = t.filter((x: any) => ["IN PROGRESS", "IN FLIGHT", "REVIEW"].includes(x.status)).length;
        const blocked = t.filter((x: any) => ["BLOCKED", "AUDIT-GATED"].includes(x.status)).length;
        const critical = t.filter((x: any) => x.priority === "CRITICAL" && x.status !== "COMPLETED").length;
        return { ...team, total, completed, inProgress, blocked, critical };
      })
    : [];

  const totalAll = leadershipOverview.reduce((a, b) => a + b.total, 0);
  const completedAll = leadershipOverview.reduce((a, b) => a + b.completed, 0);
  const inProgressAll = leadershipOverview.reduce((a, b) => a + b.inProgress, 0);
  const blockedAll = leadershipOverview.reduce((a, b) => a + b.blocked, 0);
  const criticalAll = leadershipOverview.reduce((a, b) => a + b.critical, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">U1</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900">USD1 Dashboard</h1>
                <p className="text-xs text-gray-500">{session.team.name} — {session.team.pillar}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-500">Logged in as</p>
                <p className="text-sm font-medium text-gray-700">{session.team.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLeadership ? (
          <>
            {/* Leadership Overview */}
            {activeTeamTab === "overview" && (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Executive Overview</h2>
                  <p className="text-sm text-gray-500 mt-1">All pillars — USD1 Strategic Dominance Roadmap</p>
                </div>

                {/* Global Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                  <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{totalAll}</div>
                    <div className="text-xs text-gray-500">Total Deliverables</div>
                  </div>
                  <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="text-2xl font-bold text-blue-600">{inProgressAll}</div>
                    <div className="text-xs text-gray-500">In Progress</div>
                  </div>
                  <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{completedAll}</div>
                    <div className="text-xs text-gray-500">Completed</div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="text-2xl font-bold text-orange-600">{blockedAll}</div>
                    <div className="text-xs text-gray-500">Blocked / Gated</div>
                  </div>
                  <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="text-2xl font-bold text-red-600">{criticalAll}</div>
                    <div className="text-xs text-gray-500">Critical Open</div>
                  </div>
                </div>

                {/* Team Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leadershipOverview.map((team) => {
                    const pct = team.total > 0 ? Math.round((team.completed / team.total) * 100) : 0;
                    return (
                      <button
                        key={team.slug}
                        onClick={() => setActiveTeamTab(team.slug)}
                        className="bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all text-left"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${teamColors[team.slug] || "from-gray-500 to-gray-600"} flex items-center justify-center text-lg`}>
                            {teamIcons[team.slug] || "📋"}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{team.name}</h3>
                            <p className="text-xs text-gray-500">{team.pillar} — {team.description}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div>
                            <div className="text-lg font-bold text-gray-900">{team.total}</div>
                            <div className="text-[10px] text-gray-500">Total</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-blue-600">{team.inProgress}</div>
                            <div className="text-[10px] text-gray-500">Active</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-orange-600">{team.blocked}</div>
                            <div className="text-[10px] text-gray-500">Blocked</div>
                          </div>
                          <div>
                            <div className="text-lg font-bold text-red-600">{team.critical}</div>
                            <div className="text-[10px] text-gray-500">Critical</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{pct}%</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Team Drill-down */}
            {activeTeamTab !== "overview" && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setActiveTeamTab("overview")}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    All Teams
                  </button>
                  <span className="text-gray-300">|</span>
                  <h2 className="text-xl font-bold text-gray-900">
                    {allTeams.find((t) => t.slug === activeTeamTab)?.name}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {allTeams.find((t) => t.slug === activeTeamTab)?.pillar}
                  </span>
                </div>
                <TeamDashboard
                  tasks={allTeams.find((t) => t.slug === activeTeamTab)?.tasks || []}
                  teamName={allTeams.find((t) => t.slug === activeTeamTab)?.name || ""}
                  pillar={allTeams.find((t) => t.slug === activeTeamTab)?.pillar || ""}
                  readOnly={false}
                />
              </>
            )}

            {/* Tab Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 px-4 md:hidden">
              <div className="flex justify-around">
                <button
                  onClick={() => setActiveTeamTab("overview")}
                  className={`text-xs flex flex-col items-center gap-0.5 ${activeTeamTab === "overview" ? "text-blue-600" : "text-gray-500"}`}
                >
                  <span>👁</span>
                  <span>Overview</span>
                </button>
                {allTeams.map((team) => (
                  <button
                    key={team.slug}
                    onClick={() => setActiveTeamTab(team.slug)}
                    className={`text-xs flex flex-col items-center gap-0.5 ${activeTeamTab === team.slug ? "text-blue-600" : "text-gray-500"}`}
                  >
                    <span>{teamIcons[team.slug] || "📋"}</span>
                    <span className="truncate max-w-[3rem]">{team.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Regular Team Dashboard */
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">{session.team.name} Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">{session.team.pillar} — {session.team.description}</p>
            </div>
            <TeamDashboard
              tasks={tasks}
              teamName={session.team.name}
              pillar={session.team.pillar || ""}
            />
          </>
        )}
      </main>
    </div>
  );
}

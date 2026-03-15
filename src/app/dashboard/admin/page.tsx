"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: number;
  name: string;
  display_name: string;
  must_change_password: number;
  created_at: string;
  teams: { slug: string; name: string }[];
}

interface AuditEntry {
  id: number;
  user_id: number;
  user_name: string;
  action_type: string;
  details: string;
  target_type: string;
  target_id: number;
  created_at: string;
}

const teamColors: Record<string, string> = {
  leadership: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  engineering: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  bd: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  defi: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  legal: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  marketing: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");
  const [loading, setLoading] = useState(true);
  const [resetResult, setResetResult] = useState<{ userId: number; password: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      const me = await meRes.json();
      if (me.user.activeTeam.slug !== "leadership") { router.push("/dashboard"); return; }

      const [usersRes, auditRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/audit"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs);
      }
      setLoading(false);
    }
    init();
  }, [router]);

  async function resetPassword(userId: number) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "reset_password" }),
    });
    if (res.ok) {
      const data = await res.json();
      setResetResult({ userId, password: data.tempPassword });
      // Refresh users
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) {
        const d = await usersRes.json();
        setUsers(d.users);
      }
    }
  }

  function downloadCsv() {
    window.open("/api/admin/audit?format=csv&limit=10000", "_blank");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040a18]">
        <div className="w-14 h-14 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040a18]">
      <header className="bg-[#0a1628]/90 backdrop-blur-xl border-b border-white/[0.04] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold tracking-wide"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </button>
              <div className="h-4 w-px bg-white/[0.08]" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <h1 className="text-sm font-bold text-white">Admin Panel</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-[#0d1a2d] border border-white/[0.04] rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
              activeTab === "users" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-md text-xs font-semibold tracking-wide transition-all ${
              activeTab === "audit" ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Audit Log ({auditLogs.length})
          </button>
        </div>

        {activeTab === "users" && (
          <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">User Management</h2>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{users.length} users</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">User</th>
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Username</th>
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Teams</th>
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Status</th>
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                      <td className="px-6 py-3">
                        <span className="text-sm font-medium text-white">{u.display_name}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-slate-400 font-mono">{u.name}</span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {u.teams.map((t) => (
                            <span
                              key={t.slug}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${teamColors[t.slug] || "bg-slate-500/20 text-slate-400 border-slate-500/30"}`}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {u.must_change_password ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Pending Setup
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => resetPassword(u.id)}
                          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
                        >
                          Reset Password
                        </button>
                        {resetResult?.userId === u.id && (
                          <div className="mt-1 text-[10px] text-amber-400 font-mono">
                            Temp: {resetResult.password}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="bg-[#0d1a2d] border border-white/[0.04] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.04] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Audit Log</h2>
              <button
                onClick={downloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/10 transition-all font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Time</th>
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">User</th>
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Action</th>
                    <th className="px-6 py-3 text-left text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    let details: any = {};
                    try { details = JSON.parse(log.details); } catch {}
                    return (
                      <tr key={log.id} className="border-b border-white/[0.02] hover:bg-white/[0.02]">
                        <td className="px-6 py-3 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-sm text-white font-medium">{log.user_name}</td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.06] text-slate-300">
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-400 font-mono max-w-xs truncate">
                          {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(", ") || "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                        No audit log entries yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

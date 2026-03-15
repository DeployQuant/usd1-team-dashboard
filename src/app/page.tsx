"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const teams = [
  { slug: "leadership", name: "Leadership", icon: "👁", color: "from-purple-600 to-indigo-700" },
  { slug: "engineering", name: "Engineering", icon: "⚙", color: "from-blue-600 to-cyan-700" },
  { slug: "bd", name: "Business Development", icon: "🤝", color: "from-emerald-600 to-teal-700" },
  { slug: "defi", name: "DeFi / Exchange", icon: "📊", color: "from-orange-600 to-amber-700" },
  { slug: "legal", name: "Legal & Compliance", icon: "⚖", color: "from-red-600 to-rose-700" },
  { slug: "marketing", name: "Marketing", icon: "📣", color: "from-pink-600 to-fuchsia-700" },
];

export default function LoginPage() {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeam) {
      setError("Please select a team");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: selectedTeam, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/25">
            <span className="text-2xl font-bold text-white">U1</span>
          </div>
          <h1 className="text-3xl font-bold text-white">USD1 Team Dashboard</h1>
          <p className="text-gray-400 mt-2">World Liberty Financial — Internal Operations</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Select Your Team</label>
            <div className="grid grid-cols-2 gap-2">
              {teams.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => { setSelectedTeam(t.slug); setError(""); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-all ${
                    selectedTeam === t.slug
                      ? `bg-gradient-to-r ${t.color} border-transparent text-white shadow-lg`
                      : "border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Enter team password"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">
          WLFI Confidential — Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}

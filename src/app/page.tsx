"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      if (data.user.mustChangePassword) {
        router.push("/set-password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/20">
                <span className="text-3xl font-extrabold text-white tracking-tight">U1</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-[#040a18]" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            World Liberty Financial
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <p className="text-cyan-400 text-sm font-medium tracking-widest uppercase">USD1 Operations Dashboard</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
          <p className="text-slate-500 text-xs mt-3 tracking-wide">Strategic Dominance Roadmap — Internal Access Only</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleLogin}
          className="bg-[#0a1628]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl glow-border"
        >
          <div className="mb-5">
            <label htmlFor="username" className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
              Username
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="Enter your username"
                className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all text-sm"
                autoComplete="username"
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all text-sm"
                autoComplete="current-password"
                required
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 text-sm tracking-wide"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Authenticating...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full" />
          <p className="text-slate-600 text-[11px] tracking-widest uppercase">
            WLFI Confidential
          </p>
          <div className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full" />
        </div>
      </div>
    </div>
  );
}

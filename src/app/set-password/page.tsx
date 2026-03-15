"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/");
        return;
      }
      const data = await res.json();
      if (!data.user.mustChangePassword) {
        router.push("/dashboard");
        return;
      }
      setUserName(data.user.name);
    }
    checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to set password");
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
    <div className="login-bg min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-amber-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Set Your Password</h1>
          {userName && <p className="text-slate-400 text-sm mt-2">Welcome, {userName}. Please set a new password to continue.</p>}
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0a1628]/80 backdrop-blur-2xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl glow-border"
        >
          <div className="mb-5">
            <label htmlFor="new-password" className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all text-sm"
              autoComplete="new-password"
              autoFocus
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-slate-400 mb-2 tracking-wider uppercase">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              placeholder="Re-enter your password"
              className="w-full px-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/30 transition-all text-sm"
              autoComplete="new-password"
              required
            />
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
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 text-sm tracking-wide"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting Password...
              </span>
            ) : (
              "Set Password & Continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

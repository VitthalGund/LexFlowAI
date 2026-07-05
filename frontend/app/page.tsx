'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Landmark, Lock, Mail, ShieldAlert, Cpu, Monitor, WifiOff, Sparkles, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'BRANCH_MANAGER' && user.branch_lgd_code) {
        router.push(`/branch/${user.branch_lgd_code}/maps`);
      } else if (user.role === 'AUDITOR') {
        router.push('/vault');
      } else if (user.role === 'IT_ENGINEER') {
        router.push('/it/maps');
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    setLoading(false);

    if (!success) {
      setError('Invalid email or password. Please verify credentials.');
    }
  };

  const handleQuickLogin = async (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword('demo123');
    setError('');
    setLoading(true);

    const success = await login(quickEmail, 'demo123');
    setLoading(false);
    if (!success) {
      setError('Demo login failed. Ensure FastAPI backend is running and seeded.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between text-white bg-gradient-to-br from-[#0A1628] to-[#1A3A6B] overflow-hidden select-none">
      {/* Cryptographic Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>

      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none"></div>

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 w-full max-w-lg rounded-xl p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Landmark className="h-9 w-9 text-primary-300" />
                <h1 className="text-2xl font-bold tracking-tight text-white">LexFlow AI</h1>
              </div>
              <p className="text-xs text-white/60 max-w-sm mx-auto leading-relaxed">
                Autonomous Multi-Agent Compliance Enforcement for Canara Bank. Ingestion, routing, and cryptographically verified evidence.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-3 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
                  Bank Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@canarabank.com"
                    required
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-primary-400 focus:bg-white/10 rounded px-3 py-2.5 pl-10 text-sm outline-none transition-all placeholder:text-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
                  Secure Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-primary-400 focus:bg-white/10 rounded px-3 py-2.5 pl-10 text-sm outline-none transition-all placeholder:text-white/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#0A1628] font-bold py-3 px-4 rounded shadow-lg hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-white/30 text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-[#0A1628] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>Access Secure Portal</span>
                )}
              </button>
            </form>

            <div className="relative flex items-center py-6">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-white/30 text-[10px] uppercase font-bold tracking-widest">
                Demo Quick Logins
              </span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            {/* Quick Logins */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleQuickLogin('arjun@canarabank.com')}
                disabled={loading}
                className="flex flex-col items-start p-2.5 rounded bg-white/30 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all group shrink-0"
              >
                <span className="font-semibold text-white group-hover:text-primary-300">Chief Compliance Officer</span>
                <span className="text-[9px] text-white/40 mt-0.5">HO Bengaluru</span>
              </button>

              <button
                onClick={() => handleQuickLogin('priya@canarabank.com')}
                disabled={loading}
                className="flex flex-col items-start p-2.5 rounded bg-white/30 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all group shrink-0"
              >
                <span className="font-semibold text-white group-hover:text-primary-300">Priya Nair (Manager)</span>
                <span className="text-[9px] text-white/40 mt-0.5">LGD 3202001 (Kerala)</span>
              </button>

              <button
                onClick={() => handleQuickLogin('ravi@canarabank.com')}
                disabled={loading}
                className="flex flex-col items-start p-2.5 rounded bg-white/30 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all group shrink-0"
              >
                <span className="font-semibold text-white group-hover:text-primary-300">Ravi Kumar (Manager)</span>
                <span className="text-[9px] text-white/40 mt-0.5">LGD 2902002 (Karnataka)</span>
              </button>

              <button
                onClick={() => handleQuickLogin('inspector@rbi.org.in')}
                disabled={loading}
                className="flex flex-col items-start p-2.5 rounded bg-white/30 hover:bg-white/10 border border-white/10 hover:border-white/20 text-left transition-all group shrink-0"
              >
                <span className="font-semibold text-white group-hover:text-primary-300">RBI Auditor</span>
                <span className="text-[9px] text-white/40 mt-0.5">External Inspection</span>
              </button>
            </div>
          </div>
        </div>
      </main>


      {/* Footer */}
      <footer className="w-full py-6 bg-slate-950/30 border-t border-white/5 backdrop-blur-sm relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto text-xs text-white/40 font-medium">
          <div className="flex items-center gap-1.5 mb-2 md:mb-0">
            <Cpu className="h-4 w-4 text-primary-400" />
            <span>ReguSafe LexFlow Compliance Systems</span>
          </div>
          <div>
            <span>© 2026 Canara Bank. Sovereign Compliant (DPDP Act).</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

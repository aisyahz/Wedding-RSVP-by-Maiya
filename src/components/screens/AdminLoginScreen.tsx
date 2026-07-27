import React, { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail } from 'lucide-react';
import { ScreenId } from '../../types';
import { isSupabaseConfigured, loginAdmin } from '../../lib/supabase';

interface AdminLoginScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onLoginSuccess: (session: Session) => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onNavigate,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!isSupabaseConfigured) {
      setErrorMsg('Supabase authentication is not configured.');
      setLoading(false);
      return;
    }

    const result = await loginAdmin(email, password);
    setLoading(false);
    if (!result.session || result.error) {
      setErrorMsg(result.error || 'Sign in failed because no authenticated session was returned.');
      return;
    }

    onLoginSuccess(result.session);
    onNavigate('dashboard');
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F7F5F2] p-3 antialiased min-[360px]:p-6">
      <div className="w-full max-w-md space-y-5">
        <header className="space-y-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E1E1C] text-white shadow-sm">
            <span className="font-title text-2xl font-bold">M</span>
          </div>
          <h1 className="font-title text-2xl font-bold tracking-tight text-[#1E1E1C]">
            Digital Card by Maiya
          </h1>
          <p className="text-sm text-[#77736D]">Admin Portal</p>
        </header>

        <main className="card-maiya space-y-6 p-5 min-[360px]:p-8">
          <div>
            <h2 className="font-title text-lg font-bold text-[#1E1E1C]">Welcome back</h2>
            <p className="mt-1 text-sm text-[#77736D]">Sign in to continue</p>
          </div>

          {errorMsg && (
            <div role="alert" className="flex items-start gap-2 break-words rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-sm font-semibold text-[#1E1E1C]">
                Email Address
              </label>
              <div className="relative">
                <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#77736D]" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="input-maiya w-full !pl-12"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-sm font-semibold text-[#1E1E1C]">
                Password
              </label>
              <div className="relative">
                <Lock aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#77736D]" />
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="input-maiya w-full !pl-12"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary mt-2 w-full cursor-pointer">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Studio</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

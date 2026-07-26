import React, { useState } from 'react';
import { ScreenId } from '../../types';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="min-h-dvh bg-[#F7F5F2] flex flex-col items-center justify-between p-3 min-[360px]:p-6 antialiased">
      <div className="w-full max-w-md my-auto space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#1E1E1C] text-white flex items-center justify-center mx-auto shadow-sm">
            <span className="font-title text-2xl font-bold">M</span>
          </div>
          <h1 className="font-title text-2xl font-bold text-[#1E1E1C] tracking-tight">
            Digital Card by Maiya
          </h1>
          <p className="text-xs text-[#77736D]">
            Admin Studio Portal {isSupabaseConfigured ? '• Supabase Connected' : ''}
          </p>
        </div>

        {/* Login Card */}
        <div className="card-maiya p-5 min-[360px]:p-8 space-y-6">
          <div>
            <h2 className="font-title text-lg font-bold text-[#1E1E1C]">
              Welcome back
            </h2>
            <p className="text-xs text-[#77736D] mt-1">
              Sign in to manage your digital wedding invitations
            </p>
          </div>

          {errorMsg && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2 break-words">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full input-maiya pl-10"
                  placeholder="admin@example.com"
                />
                <Mail className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1E1C] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full input-maiya pl-10"
                  placeholder="••••••••••••"
                />
                <Lock className="w-4 h-4 text-[#77736D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Studio</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge */}
        <p className="text-[11px] text-[#77736D] text-center flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#9B7B63]" />
          <span>Secured Administrator Portal</span>
        </p>
      </div>
    </div>
  );
};

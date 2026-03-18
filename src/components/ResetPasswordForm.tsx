'use client';

import Link from 'next/link';
import { Lock, ShieldCheck } from 'lucide-react';
import { useActionState } from 'react';
import { resetPasswordWithToken } from '@/actions/auth';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(resetPasswordWithToken, null);

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        {state?.error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
            {state.error}
          </div>
        )}
        {state?.success && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-100">
            {state.success}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">New Password</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Lock size={18} />
            </div>
            <input
              type="password"
              name="newPassword"
              placeholder="Use at least 8 characters"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Confirm Password</label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <ShieldCheck size={18} />
            </div>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm the new password"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>
        </div>

        <button disabled={isPending} type="submit" className="w-full disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors shadow-md shadow-blue-500/20 mt-2">
          {isPending ? 'Resetting Password...' : 'Reset Password'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/sign-in" className="text-sm text-blue-500 font-medium hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

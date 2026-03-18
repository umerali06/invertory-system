'use client';

import { BookOpen, Mail } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { requestPasswordReset } from '@/actions/auth';

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-500 text-white w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Forgot Password</h1>
          <p className="text-slate-500 mt-1">Enter your email address to reset your account password.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {state.error}
              </div>
            )}
            {state?.success && (
              <div className="space-y-3">
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm border border-emerald-100">
                  {state.success}
                </div>
                {state.previewUrl && (
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm border border-blue-100 break-all">
                    <p className="font-medium mb-1">Preview reset link</p>
                    <Link href={state.previewUrl} className="underline underline-offset-2">
                      {state.previewUrl}
                    </Link>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button disabled={isPending} type="submit" className="w-full disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors shadow-md shadow-blue-500/20 mt-2">
              {isPending ? 'Preparing Reset...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/sign-in" className="text-sm text-blue-500 font-medium hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

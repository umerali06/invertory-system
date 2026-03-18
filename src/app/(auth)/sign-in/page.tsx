'use client';

import { BookOpen, Lock, Mail, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { signIn } from '@/actions/auth';

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(signIn, null);
  const [email, setEmail] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [isCheckingRequirements, startRequirementTransition] = useTransition();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const emailValueRef = useRef('');
  const lastRequirementEmailRef = useRef('');

  const checkSignInRequirements = (nextEmail: string) => {
    const trimmedEmail = nextEmail.trim();
    const normalizedEmail = trimmedEmail.toLowerCase();

    if (!normalizedEmail) {
      lastRequirementEmailRef.current = '';
      setRequiresTwoFactor(false);
      return;
    }

    if (lastRequirementEmailRef.current === normalizedEmail) {
      return;
    }

    lastRequirementEmailRef.current = normalizedEmail;

    startRequirementTransition(async () => {
      try {
        const response = await fetch(`/api/auth/sign-in-requirements?email=${encodeURIComponent(normalizedEmail)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!response.ok) {
          setRequiresTwoFactor(false);
          return;
        }

        const data = (await response.json()) as { requiresTwoFactor?: boolean };
        if (lastRequirementEmailRef.current === normalizedEmail) {
          setRequiresTwoFactor(Boolean(data.requiresTwoFactor));
        }
      } catch {
        if (lastRequirementEmailRef.current === normalizedEmail) {
          setRequiresTwoFactor(false);
        }
      }
    });
  };

  useEffect(() => {
    emailValueRef.current = email;
  }, [email]);

  useEffect(() => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      lastRequirementEmailRef.current = '';
      return;
    }

    const timeout = window.setTimeout(() => {
      checkSignInRequirements(trimmedEmail);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [email]);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 12;
    let timeoutId: number | null = null;

    const syncAutofilledEmail = () => {
      const inputValue = emailInputRef.current?.value?.trim() ?? '';

      if (inputValue && inputValue !== emailValueRef.current) {
        lastRequirementEmailRef.current = '';
        setRequiresTwoFactor(false);
        setEmail(inputValue);
        return;
      }

      if (attempts < maxAttempts) {
        attempts += 1;
        timeoutId = window.setTimeout(syncAutofilledEmail, 250);
      }
    };

    syncAutofilledEmail();

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const shouldShowTwoFactor =
    requiresTwoFactor || Boolean(state?.error && state.error.includes('Google Authenticator code'));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-500 text-white w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Shopline Inventory</h1>
          <p className="text-slate-500 mt-1">Sign in to manage your bookstore</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                {state.error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  ref={emailInputRef}
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => {
                    lastRequirementEmailRef.current = '';
                    setRequiresTwoFactor(false);
                    setEmail(event.target.value);
                  }}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              {isCheckingRequirements && (
                <p className="text-xs text-slate-400">Checking account security settings...</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {shouldShowTwoFactor && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Google Authenticator Code</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <ShieldCheck size={18} />
                  </div>
                  <input
                    type="text"
                    name="authCode"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all tracking-widest font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-slate-400">This account has Google Authenticator enabled.</p>
              </div>
            )}

            <button disabled={isPending} type="submit" className="w-full disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors shadow-md shadow-blue-500/20 mt-2">
              {isPending ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center flex flex-col gap-2">
            <Link href="/forgot-password" className="text-sm text-blue-500 font-medium hover:underline">
              Forgot password?
            </Link>
            <span className="text-sm text-slate-500">
              Need an account?{' '}
              <Link href="/sign-up" className="text-blue-500 font-medium hover:underline">
                Sign Up
              </Link>
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Protected by enterprise-grade security
        </p>
      </div>
    </div>
  );
}

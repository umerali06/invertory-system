import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { validatePasswordResetToken } from '@/actions/auth';
import ResetPasswordForm from '@/components/ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? '';
  const validation = await validatePasswordResetToken(token);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-blue-500 text-white w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
          <p className="text-slate-500 mt-1">Create a new password for your Shopline Inventory account.</p>
        </div>

        {validation.valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {validation.error}
            </div>
            <div className="mt-6 text-center">
              <Link href="/forgot-password" className="text-sm text-blue-500 font-medium hover:underline">
                Request a new reset link
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

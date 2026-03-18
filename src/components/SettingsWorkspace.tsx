'use client';

import Image from 'next/image';
import { Bell, Lock, ShieldCheck } from 'lucide-react';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  deactivateAccount,
  disableTwoFactor,
  updateNotificationPreferences,
  updatePassword,
} from '@/actions/auth';
import type { NotificationPreferences } from '@/lib/app-types';

type TwoFactorSetupDetails = {
  secret: string;
  otpauthUri: string;
  qrCodeDataUrl: string;
};

export default function SettingsWorkspace({
  user,
}: {
  user: {
    name: string;
    email: string;
    role: string;
    twoFactorEnabled: boolean;
    notificationPreferences: NotificationPreferences;
    pendingTwoFactorSetup: boolean;
    pendingTwoFactorDetails: TwoFactorSetupDetails | null;
  };
}) {
  const router = useRouter();
  const [passwordState, passwordAction, passwordPending] = useActionState(updatePassword, null);
  const [twoFactorState, twoFactorAction, twoFactorPending] = useActionState(confirmTwoFactorSetup, null);
  const [setupDetails, setSetupDetails] = useState<TwoFactorSetupDetails | null>(user.pendingTwoFactorDetails);
  const [notificationPending, startNotificationTransition] = useTransition();
  const [twoFactorTransition, startTwoFactorTransition] = useTransition();
  const [deactivationPending, startDeactivationTransition] = useTransition();

  useEffect(() => {
    if (twoFactorState?.success) {
      toast.success(twoFactorState.success);
      router.refresh();
    }
  }, [router, twoFactorState]);

  const handleGenerateSecret = () => {
    startTwoFactorTransition(async () => {
      const response = await beginTwoFactorSetup();
      if (!response.success) {
        toast.error('Unable to start Google Authenticator setup.');
        return;
      }

      setSetupDetails({
        secret: response.secret,
        otpauthUri: response.otpauthUri,
        qrCodeDataUrl: response.qrCodeDataUrl,
      });
      toast.success('Google Authenticator setup generated.');
    });
  };

  const handleDisableTwoFactor = () => {
    startTwoFactorTransition(async () => {
      const response = await disableTwoFactor();
      if (!response.success) {
        toast.error('Unable to disable Google Authenticator.');
        return;
      }

      setSetupDetails(null);
      toast.success('Google Authenticator disabled.');
      router.refresh();
    });
  };

  const handleDeactivateAccount = () => {
    startDeactivationTransition(async () => {
      await deactivateAccount();
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage password security, Google Authenticator, and account preferences.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg text-blue-500">
            <Lock size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Change Password</h2>
            <p className="text-sm text-slate-500">{user.name} · {user.email}</p>
          </div>
        </div>

        <form action={passwordAction} className="space-y-4 max-w-2xl">
          {passwordState?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {passwordState.error}
            </div>
          )}
          {passwordState?.success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-100">
              {passwordState.success}
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Current Password</label>
            <input type="password" name="currentPassword" placeholder="Enter current password" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">New Password</label>
            <input type="password" name="newPassword" placeholder="Use at least 8 characters" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Confirm New Password</label>
            <input type="password" name="confirmPassword" placeholder="Confirm the new password" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <button disabled={passwordPending} type="submit" className="bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 text-white font-medium px-4 py-2.5 rounded-lg transition-colors !mt-6">
            {passwordPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-2 rounded-lg text-emerald-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Google Authenticator</h2>
            <p className="text-sm text-slate-500">Use the Google Authenticator app for 6-digit TOTP verification codes.</p>
          </div>
        </div>

        {user.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-emerald-200 rounded-lg p-4 bg-emerald-50">
              <div>
                <p className="font-medium text-emerald-800">Google Authenticator is enabled</p>
                <p className="text-xs text-emerald-700 mt-1">You will be asked for the current 6-digit code every time you sign in.</p>
              </div>
              <button onClick={handleDisableTwoFactor} disabled={twoFactorTransition} className="border border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100 font-medium px-4 py-2 rounded-lg transition-colors text-sm">
                Disable
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-slate-200 rounded-lg p-4">
              <div>
                <p className="font-medium text-slate-800">Google Authenticator is disabled</p>
                <p className="text-xs text-slate-500 mt-1">Generate a QR code, scan it with Google Authenticator, then confirm with the current code.</p>
              </div>
              <button onClick={handleGenerateSecret} disabled={twoFactorTransition} className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm">
                {twoFactorTransition ? 'Preparing...' : 'Generate QR Code'}
              </button>
            </div>

            {(setupDetails || user.pendingTwoFactorSetup) && (
              <form action={twoFactorAction} className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                {setupDetails && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Scan with Google Authenticator</p>
                      <div className="mt-2 inline-flex rounded-xl border border-slate-200 bg-white p-3">
                        <Image src={setupDetails.qrCodeDataUrl} alt="Google Authenticator QR code" width={176} height={176} unoptimized />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Manual setup key</p>
                      <p className="mt-1 rounded-md bg-white px-3 py-2 font-mono text-sm text-slate-700 border border-slate-200 break-all">{setupDetails.secret}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">otpauth URI</p>
                      <p className="mt-1 rounded-md bg-white px-3 py-2 font-mono text-xs text-slate-700 border border-slate-200 break-all">{setupDetails.otpauthUri}</p>
                    </div>
                  </>
                )}
                {twoFactorState?.error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                    {twoFactorState.error}
                  </div>
                )}
                {twoFactorState?.success && (
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm border border-emerald-100">
                    {twoFactorState.success}
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Verification Code</label>
                  <input type="text" name="verificationCode" maxLength={6} placeholder="Enter the current 6-digit code" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <button disabled={twoFactorPending} type="submit" className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium px-4 py-2.5 rounded-lg transition-colors">
                  {twoFactorPending ? 'Confirming...' : 'Enable Google Authenticator'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg text-blue-500">
            <Bell size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Notification Preferences</h2>
            <p className="text-sm text-slate-500">These settings are stored on your account and used across the dashboard.</p>
          </div>
        </div>

        <form
          action={(formData) => {
            startNotificationTransition(async () => {
              const response = await updateNotificationPreferences(formData);
              if (response.success) {
                toast.success('Notification preferences updated.');
              }
            });
          }}
          className="space-y-4 divide-y divide-slate-100"
        >
          <label className="flex items-center justify-between pt-2">
            <div>
              <p className="font-medium text-slate-800 text-sm">Stock Alerts</p>
              <p className="text-xs text-slate-500 mt-0.5">Get notified when stock falls below the reorder level.</p>
            </div>
            <input type="checkbox" name="stockAlerts" defaultChecked={user.notificationPreferences.stockAlerts} className="h-5 w-5 rounded border-slate-300 text-blue-500" />
          </label>
          <label className="flex items-center justify-between pt-4">
            <div>
              <p className="font-medium text-slate-800 text-sm">Activity Updates</p>
              <p className="text-xs text-slate-500 mt-0.5">Receive alerts when inventory changes are recorded.</p>
            </div>
            <input type="checkbox" name="activityUpdates" defaultChecked={user.notificationPreferences.activityUpdates} className="h-5 w-5 rounded border-slate-300 text-blue-500" />
          </label>
          <label className="flex items-center justify-between pt-4">
            <div>
              <p className="font-medium text-slate-800 text-sm">System Notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">Important maintenance and security notifications.</p>
            </div>
            <input type="checkbox" name="systemNotifications" defaultChecked={user.notificationPreferences.systemNotifications} className="h-5 w-5 rounded border-slate-300 text-blue-500" />
          </label>
          <button disabled={notificationPending} type="submit" className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium px-4 py-2.5 rounded-lg transition-colors">
            {notificationPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>

      <div className="bg-red-50/50 border border-red-200 rounded-xl p-6">
        <h2 className="font-semibold text-red-700 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-red-800 text-sm">Deactivate Account</p>
            <p className="text-xs text-red-600/80 mt-0.5">This disables the current account and signs you out immediately.</p>
          </div>
          <button onClick={handleDeactivateAccount} disabled={deactivationPending} className="border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 font-medium px-4 py-2 rounded-lg transition-colors text-sm">
            {deactivationPending ? 'Deactivating...' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}

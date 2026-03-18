import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import type { AppUser, NotificationPreferences } from '@/lib/app-types';
import { DEFAULT_NOTIFICATION_PREFERENCES, cleanString, toIsoString } from '@/lib/utils';

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function resolveNotificationPreferences(value: unknown): NotificationPreferences {
  if (!value || typeof value !== 'object') {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const source = value as Partial<NotificationPreferences>;
  return {
    stockAlerts: source.stockAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.stockAlerts,
    activityUpdates: source.activityUpdates ?? DEFAULT_NOTIFICATION_PREFERENCES.activityUpdates,
    systemNotifications: source.systemNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.systemNotifications,
  };
}

export function mapUserDocument(id: string, value: Record<string, unknown>): AppUser {
  return {
    id,
    name: cleanString(value.name) || 'User',
    email: cleanString(value.email),
    role: cleanString(value.role) || 'Administrator',
    active: value.active !== false,
    twoFactorEnabled: Boolean(value.twoFactorEnabled),
    notificationPreferences: resolveNotificationPreferences(value.notificationPreferences),
    createdAt: toIsoString(value.createdAt, new Date(0).toISOString()),
  };
}

async function readUserById(userId: string) {
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    return null;
  }

  return mapUserDocument(userDoc.id, userDoc.data() ?? {});
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS).toISOString();

  await adminDb.collection('sessions').doc(token).set({
    userId,
    createdAt: now.toISOString(),
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  });

  return token;
}

export async function deleteSession(token?: string) {
  const cookieStore = await cookies();
  const sessionToken = token ?? cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await adminDb.collection('sessions').doc(sessionToken).delete().catch(() => undefined);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const sessionDoc = await adminDb.collection('sessions').doc(token).get();
  if (sessionDoc.exists) {
    const session = sessionDoc.data() ?? {};
    const expiresAt = toIsoString(session.expiresAt, new Date(0).toISOString());
    if (new Date(expiresAt).getTime() < Date.now()) {
      return null;
    }

    const sessionUser = await readUserById(cleanString(session.userId));
    if (!sessionUser?.active) {
      return null;
    }

    return sessionUser;
  }

  const legacyUser = await readUserById(token);
  if (!legacyUser?.active) {
    return null;
  }

  return legacyUser;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return user;
}

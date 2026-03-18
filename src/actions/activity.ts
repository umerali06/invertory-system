'use server';

import { createActivityLog, mapActivityDocument } from '@/lib/activity-log';
import type { ActivityStatus } from '@/lib/app-types';
import { adminDb } from '@/lib/firebase/admin';
import { requireCurrentUser } from '@/lib/session';
import { cleanString, safeDate } from '@/lib/utils';

type ActivityFilters = {
  query?: string;
  period?: 'all-time' | 'today' | 'this-week' | 'this-month';
  limit?: number;
};

function withinPeriod(createdAt: string, period: ActivityFilters['period']) {
  if (!period || period === 'all-time') {
    return true;
  }

  const date = safeDate(createdAt);
  const now = new Date();

  if (period === 'today') {
    return date.toDateString() === now.toDateString();
  }

  if (period === 'this-week') {
    const start = new Date(now);
    const day = start.getDay();
    const offset = (day + 6) % 7;
    start.setDate(start.getDate() - offset);
    start.setHours(0, 0, 0, 0);
    return date >= start;
  }

  if (period === 'this-month') {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  return true;
}

export async function getActivities(filters: ActivityFilters = {}) {
  await requireCurrentUser();

  const snapshot = await adminDb.collection('activity_logs').orderBy('timestamp', 'desc').limit(filters.limit ?? 200).get();
  const query = cleanString(filters.query).toLowerCase();

  const activities = snapshot.docs
    .map((doc) => mapActivityDocument(doc.id, doc.data() ?? {}))
    .filter((activity) => withinPeriod(activity.createdAt, filters.period))
    .filter((activity) => {
      if (!query) {
        return true;
      }

      const haystack = `${activity.type} ${activity.action} ${activity.userName ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });

  return {
    success: true,
    data: activities,
  };
}

export async function getRecentScanActivities(limit = 6) {
  await requireCurrentUser();

  const snapshot = await adminDb.collection('activity_logs').orderBy('timestamp', 'desc').limit(100).get();
  const activities = snapshot.docs
    .map((doc) => mapActivityDocument(doc.id, doc.data() ?? {}))
    .filter((activity) => activity.type === 'Product Search' || activity.type === 'Inventory Scan')
    .slice(0, limit);

  return {
    success: true,
    data: activities,
  };
}

export async function logActivity(type: string, action: string, status: ActivityStatus) {
  const user = await requireCurrentUser();
  await createActivityLog({
    type,
    action,
    status,
    user,
  });
  return { success: true };
}

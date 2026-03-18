import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase/admin';
import type { ActivityLog, ActivityStatus, AppUser } from '@/lib/app-types';
import { formatDateTime, getBrowserLabel, toIsoString } from '@/lib/utils';

type CreateActivityInput = {
  type: string;
  action: string;
  status: ActivityStatus;
  user?: AppUser | null;
  entityId?: string;
  entityType?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function createActivityLog(input: CreateActivityInput) {
  const headerStore = await headers();
  const createdAt = new Date().toISOString();
  const forwardedFor = headerStore.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || headerStore.get('x-real-ip') || 'Unknown';
  const userAgent = headerStore.get('user-agent') || '';

  await adminDb.collection('activity_logs').add({
    type: input.type,
    action: input.action,
    status: input.status,
    createdAt,
    time: formatDateTime(createdAt),
    browser: getBrowserLabel(userAgent),
    ip,
    timestamp: Date.now(),
    userId: input.user?.id ?? null,
    userName: input.user?.name ?? null,
    entityId: input.entityId ?? null,
    entityType: input.entityType ?? null,
    metadata: input.metadata ?? {},
  });
}

export function mapActivityDocument(id: string, value: Record<string, unknown>): ActivityLog {
  const createdAt = toIsoString(value.createdAt ?? value.timestamp ?? value.time, new Date(0).toISOString());

  return {
    id,
    type: typeof value.type === 'string' ? value.type : 'Activity',
    action: typeof value.action === 'string' ? value.action : 'No details available.',
    status:
      value.status === 'success' ||
      value.status === 'info' ||
      value.status === 'warning' ||
      value.status === 'error'
        ? value.status
        : 'info',
    createdAt,
    timeLabel: typeof value.time === 'string' ? value.time : formatDateTime(createdAt),
    browser: typeof value.browser === 'string' && value.browser ? value.browser : 'Browser',
    ip: typeof value.ip === 'string' && value.ip ? value.ip : 'Unknown',
    userId: typeof value.userId === 'string' ? value.userId : undefined,
    userName: typeof value.userName === 'string' ? value.userName : undefined,
    entityId: typeof value.entityId === 'string' ? value.entityId : undefined,
    entityType: typeof value.entityType === 'string' ? value.entityType : undefined,
    metadata:
      value.metadata && typeof value.metadata === 'object'
        ? (value.metadata as Record<string, string | number | boolean | null>)
        : undefined,
  };
}

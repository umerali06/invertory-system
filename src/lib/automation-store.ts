import { adminDb } from '@/lib/firebase/admin';
import type { AutomationSession } from '@/lib/app-types';
import { formatDateTime, toIsoString } from '@/lib/utils';

const AUTOMATION_COLLECTION = 'automation_sessions';

export function mapAutomationSession(id: string, value: Record<string, unknown>): AutomationSession {
  const startedAt = toIsoString(value.startedAt, new Date(0).toISOString());
  const endedAt = value.endedAt ? toIsoString(value.endedAt) : undefined;

  return {
    id,
    name: typeof value.name === 'string' && value.name ? value.name : 'Automation Session',
    notes: typeof value.notes === 'string' ? value.notes : '',
    status: value.status === 'completed' ? 'completed' : 'active',
    startedAt,
    startedAtLabel: formatDateTime(startedAt),
    endedAt,
    endedAtLabel: endedAt ? formatDateTime(endedAt) : undefined,
    startedByName: typeof value.startedByName === 'string' && value.startedByName ? value.startedByName : 'Unknown',
    processedItems: Number(value.processedItems) || 0,
    processedUnits: Number(value.processedUnits) || 0,
  };
}

export async function getActiveAutomationSessionForUser(userId: string) {
  const snapshot = await adminDb.collection(AUTOMATION_COLLECTION).limit(100).get();
  const document = snapshot.docs
    .filter((doc) => doc.data().userId === userId && doc.data().status === 'active')
    .sort((left, right) => {
      const leftStarted = typeof left.data().startedAt === 'string' ? Date.parse(left.data().startedAt) : 0;
      const rightStarted = typeof right.data().startedAt === 'string' ? Date.parse(right.data().startedAt) : 0;
      return rightStarted - leftStarted;
    })[0];

  if (!document) {
    return null;
  }

  return {
    ref: document.ref,
    session: mapAutomationSession(document.id, document.data() ?? {}),
  };
}

export async function getRecentAutomationSessionsForUser(userId: string, limit = 5) {
  const snapshot = await adminDb.collection(AUTOMATION_COLLECTION).limit(100).get();

  return snapshot.docs
    .filter((doc) => doc.data().userId === userId)
    .sort((left, right) => {
      const leftStarted = typeof left.data().startedAt === 'string' ? Date.parse(left.data().startedAt) : 0;
      const rightStarted = typeof right.data().startedAt === 'string' ? Date.parse(right.data().startedAt) : 0;
      return rightStarted - leftStarted;
    })
    .slice(0, limit)
    .map((doc) => mapAutomationSession(doc.id, doc.data() ?? {}));
}

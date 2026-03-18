'use server';

import { revalidatePath } from 'next/cache';
import { createActivityLog } from '@/lib/activity-log';
import { adminDb } from '@/lib/firebase/admin';
import { getActiveAutomationSessionForUser, getRecentAutomationSessionsForUser } from '@/lib/automation-store';
import { requireCurrentUser } from '@/lib/session';
import { cleanString } from '@/lib/utils';

export async function getAutomationOverview() {
  const user = await requireCurrentUser();
  const activeSession = await getActiveAutomationSessionForUser(user.id);
  const recentSessions = await getRecentAutomationSessionsForUser(user.id, 5);

  return {
    activeSession: activeSession?.session ?? null,
    recentSessions,
  };
}

export async function startAutomationSession(input?: { name?: string; notes?: string }) {
  const user = await requireCurrentUser();
  const existingSession = await getActiveAutomationSessionForUser(user.id);

  if (existingSession) {
    return { success: true, data: existingSession.session };
  }

  const now = new Date().toISOString();
  const name = cleanString(input?.name) || `Session ${new Date().toLocaleString()}`;
  const notes = cleanString(input?.notes);

  const sessionRef = await adminDb.collection('automation_sessions').add({
    userId: user.id,
    startedByName: user.name,
    name,
    notes,
    status: 'active',
    startedAt: now,
    processedItems: 0,
    processedUnits: 0,
  });

  const createdSession = {
    id: sessionRef.id,
    name,
    notes,
    status: 'active' as const,
    startedAt: now,
    startedAtLabel: new Date(now).toLocaleString(),
    startedByName: user.name,
    processedItems: 0,
    processedUnits: 0,
  };

  await createActivityLog({
    type: 'Automation Session',
    action: `Started automation session "${name}".`,
    status: 'success',
    user,
    entityId: sessionRef.id,
    entityType: 'automation-session',
  });

  revalidatePath('/automation/quick-scan');
  revalidatePath('/automation/batch-update');

  return { success: true, data: createdSession };
}

export async function endAutomationSession() {
  const user = await requireCurrentUser();
  const activeSession = await getActiveAutomationSessionForUser(user.id);

  if (!activeSession) {
    return { success: false, error: 'No active automation session found.' };
  }

  const endedAt = new Date().toISOString();
  await activeSession.ref.update({
    status: 'completed',
    endedAt,
  });

  await createActivityLog({
    type: 'Automation Session',
    action: `Completed automation session "${activeSession.session.name}".`,
    status: 'info',
    user,
    entityId: activeSession.session.id,
    entityType: 'automation-session',
  });

  revalidatePath('/automation/quick-scan');
  revalidatePath('/automation/batch-update');

  return { success: true };
}

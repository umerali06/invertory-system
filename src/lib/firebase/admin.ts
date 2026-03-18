import * as admin from 'firebase-admin';
import { normalizeEnvValue } from '@/lib/utils';

function getAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = normalizeEnvValue(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase admin credentials are not configured correctly.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const adminApp = getAdminApp();

export const adminDb = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);

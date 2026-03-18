import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

function normalizeEmail(value: string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = normalizeEmail(searchParams.get('email'));

  if (!email) {
    return NextResponse.json({ requiresTwoFactor: false });
  }

  const directMatch = await adminDb.collection('users').where('email', '==', email).limit(1).get();

  if (!directMatch.empty) {
    return NextResponse.json({
      requiresTwoFactor: Boolean(directMatch.docs[0].data()?.twoFactorEnabled),
    });
  }

  const snapshot = await adminDb.collection('users').get();
  const userDoc = snapshot.docs.find((doc) => normalizeEmail(String(doc.data()?.email ?? '')) === email);

  return NextResponse.json({
    requiresTwoFactor: Boolean(userDoc?.data()?.twoFactorEnabled),
  });
}

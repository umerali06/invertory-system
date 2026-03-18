'use server';

import QRCode from 'qrcode';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase/admin';
import { createActivityLog } from '@/lib/activity-log';
import { buildAbsoluteUrl, sendPasswordResetEmail } from '@/lib/email';
import {
  buildOtpAuthUri,
  generateBase32Secret,
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
  verifyTotpCode,
} from '@/lib/security';
import { createSession, deleteSession, getCurrentUser as getSessionUser, requireCurrentUser } from '@/lib/session';
import { DEFAULT_NOTIFICATION_PREFERENCES, cleanString } from '@/lib/utils';

async function findUserDocumentByEmail(email: string) {
  const normalizedEmail = cleanString(email).toLowerCase();
  const directMatch = await adminDb.collection('users').where('email', '==', normalizedEmail).limit(1).get();

  if (!directMatch.empty) {
    return directMatch.docs[0];
  }

  const snapshot = await adminDb.collection('users').get();
  return snapshot.docs.find((doc) => cleanString(doc.data().email).toLowerCase() === normalizedEmail) ?? null;
}

async function buildTwoFactorSetupDetails(email: string, secret: string) {
  const otpauthUri = buildOtpAuthUri(email, secret, 'Shopline Inventory');
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 220,
    margin: 1,
  });

  return {
    secret,
    otpauthUri,
    qrCodeDataUrl,
  };
}

async function findUserByResetToken(token: string) {
  const tokenHash = hashToken(token);
  const directMatch = await adminDb.collection('users').where('passwordResetTokenHash', '==', tokenHash).limit(1).get();

  if (!directMatch.empty) {
    return directMatch.docs[0];
  }

  const snapshot = await adminDb.collection('users').get();
  return snapshot.docs.find((doc) => cleanString(doc.data().passwordResetTokenHash) === tokenHash) ?? null;
}

export async function signUp(_: unknown, formData: FormData) {
  const name = cleanString(formData.get('name'));
  const email = cleanString(formData.get('email')).toLowerCase();
  const password = cleanString(formData.get('password'));

  if (!name || !email || !password) {
    return { error: 'All fields are required.' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  const existingUser = await findUserDocumentByEmail(email);
  if (existingUser) {
    return { error: 'An account with this email already exists.' };
  }

  const createdAt = new Date().toISOString();
  const userRef = await adminDb.collection('users').add({
    name,
    email,
    role: 'Administrator',
    active: true,
    passwordHash: hashPassword(password),
    twoFactorEnabled: false,
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt,
  });

  const user = {
    id: userRef.id,
    name,
    email,
    role: 'Administrator',
    active: true,
    twoFactorEnabled: false,
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt,
  };

  await createSession(userRef.id);
  await createActivityLog({
    type: 'Account Created',
    action: `Created a new account for ${email}.`,
    status: 'success',
    user,
    entityId: userRef.id,
    entityType: 'user',
  });

  redirect('/dashboard');
}

export async function signIn(_: unknown, formData: FormData) {
  const email = cleanString(formData.get('email')).toLowerCase();
  const password = cleanString(formData.get('password'));
  const authCode = cleanString(formData.get('authCode'));

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const userDoc = await findUserDocumentByEmail(email);
  if (!userDoc?.exists) {
    return { error: 'Invalid email or password.' };
  }

  const userData = userDoc.data() ?? {};
  if (userData.active === false) {
    return { error: 'This account has been deactivated.' };
  }

  const storedHash = cleanString(userData.passwordHash) || cleanString(userData.password);
  if (!verifyPassword(password, storedHash)) {
    return { error: 'Invalid email or password.' };
  }

  if (!cleanString(userData.passwordHash)) {
    await userDoc.ref.update({ passwordHash: hashPassword(password) });
  }

  if (userData.twoFactorEnabled) {
    const secret = cleanString(userData.twoFactorSecret);
    if (!secret) {
      return { error: 'Google Authenticator is enabled but not configured correctly.' };
    }

    if (!verifyTotpCode(secret, authCode)) {
      return { error: 'Enter the current 6-digit Google Authenticator code.' };
    }
  }

  await createSession(userDoc.id);

  const user = {
    id: userDoc.id,
    name: cleanString(userData.name) || 'User',
    email: cleanString(userData.email),
    role: cleanString(userData.role) || 'Administrator',
    active: true,
    twoFactorEnabled: Boolean(userData.twoFactorEnabled),
    notificationPreferences: userData.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: cleanString(userData.createdAt) || new Date().toISOString(),
  };

  await createActivityLog({
    type: 'Login',
    action: 'Signed in successfully.',
    status: 'success',
    user,
    entityId: userDoc.id,
    entityType: 'user',
  });

  redirect('/dashboard');
}

export async function logout() {
  const user = await getSessionUser();
  await deleteSession();

  if (user) {
    await createActivityLog({
      type: 'Logout',
      action: 'Signed out of the system.',
      status: 'info',
      user,
      entityId: user.id,
      entityType: 'user',
    });
  }

  redirect('/sign-in');
}

export async function updatePassword(_: unknown, formData: FormData) {
  const currentPassword = cleanString(formData.get('currentPassword'));
  const newPassword = cleanString(formData.get('newPassword'));
  const confirmPassword = cleanString(formData.get('confirmPassword'));

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All password fields are required.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match.' };
  }

  if (newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters long.' };
  }

  const user = await requireCurrentUser();
  const userDoc = await adminDb.collection('users').doc(user.id).get();
  const userData = userDoc.data() ?? {};
  const storedHash = cleanString(userData.passwordHash) || cleanString(userData.password);

  if (!verifyPassword(currentPassword, storedHash)) {
    return { error: 'Current password is incorrect.' };
  }

  await userDoc.ref.update({
    passwordHash: hashPassword(newPassword),
    password: null,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    updatedAt: new Date().toISOString(),
  });

  await createActivityLog({
    type: 'Password Change',
    action: 'Changed account password.',
    status: 'warning',
    user,
    entityId: user.id,
    entityType: 'user',
  });

  return { success: 'Password updated successfully.' };
}

export async function requestPasswordReset(_: unknown, formData: FormData) {
  const email = cleanString(formData.get('email')).toLowerCase();

  if (!email) {
    return { error: 'Enter your email address.' };
  }

  const userDoc = await findUserDocumentByEmail(email);
  if (!userDoc?.exists) {
    return {
      success: 'If an account exists for that email, a password reset link has been prepared.',
    };
  }

  const userData = userDoc.data() ?? {};
  const resetToken = generateSecureToken();
  const passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const resetUrl = await buildAbsoluteUrl(`/reset-password?token=${resetToken}`);

  await userDoc.ref.update({
    passwordResetTokenHash: hashToken(resetToken),
    passwordResetExpiresAt,
    updatedAt: new Date().toISOString(),
  });

  const delivery = await sendPasswordResetEmail({
    to: email,
    name: cleanString(userData.name) || 'there',
    resetUrl,
  });

  await createActivityLog({
    type: 'Password Reset Requested',
    action: `Requested a password reset for ${email}.`,
    status: 'info',
    entityId: userDoc.id,
    entityType: 'user',
    metadata: {
      emailDelivered: delivery.delivered,
    },
  });

  return {
    success: delivery.delivered
      ? 'Password reset instructions were sent to your email.'
      : 'Email delivery is not configured. Use the generated reset link below.',
    previewUrl: delivery.previewUrl,
  };
}

export async function validatePasswordResetToken(token: string) {
  const cleanToken = cleanString(token);
  if (!cleanToken) {
    return { valid: false, error: 'The reset link is missing a token.' };
  }

  const userDoc = await findUserByResetToken(cleanToken);
  if (!userDoc?.exists) {
    return { valid: false, error: 'This password reset link is invalid.' };
  }

  const userData = userDoc.data() ?? {};
  const expiresAt = cleanString(userData.passwordResetExpiresAt);

  if (!expiresAt || new Date(expiresAt).getTime() < Date.now()) {
    return { valid: false, error: 'This password reset link has expired.' };
  }

  return {
    valid: true,
    email: cleanString(userData.email),
  };
}

export async function resetPasswordWithToken(_: unknown, formData: FormData) {
  const token = cleanString(formData.get('token'));
  const newPassword = cleanString(formData.get('newPassword'));
  const confirmPassword = cleanString(formData.get('confirmPassword'));

  if (!token) {
    return { error: 'Missing reset token.' };
  }

  if (!newPassword || !confirmPassword) {
    return { error: 'Enter and confirm your new password.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters long.' };
  }

  const validation = await validatePasswordResetToken(token);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const userDoc = await findUserByResetToken(token);
  if (!userDoc?.exists) {
    return { error: 'This password reset link is invalid.' };
  }

  await userDoc.ref.update({
    passwordHash: hashPassword(newPassword),
    password: null,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    updatedAt: new Date().toISOString(),
  });

  const sessions = await adminDb.collection('sessions').where('userId', '==', userDoc.id).get();
  const batch = adminDb.batch();
  sessions.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  await createActivityLog({
    type: 'Password Reset Completed',
    action: `Completed a password reset for ${cleanString(userDoc.data()?.email)}.`,
    status: 'success',
    entityId: userDoc.id,
    entityType: 'user',
  });

  return {
    success: 'Password reset successfully. You can now sign in with the new password.',
  };
}

export async function getCurrentUser() {
  return getSessionUser();
}

export async function getUserSettings() {
  const user = await requireCurrentUser();
  const userDoc = await adminDb.collection('users').doc(user.id).get();
  const userData = userDoc.data() ?? {};
  const pendingSecret = cleanString(userData.pendingTwoFactorSecret);

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    twoFactorEnabled: Boolean(userData.twoFactorEnabled),
    notificationPreferences: userData.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
    pendingTwoFactorSetup: Boolean(pendingSecret),
    pendingTwoFactorDetails: pendingSecret
      ? await buildTwoFactorSetupDetails(user.email, pendingSecret)
      : null,
  };
}

export async function beginTwoFactorSetup() {
  const user = await requireCurrentUser();
  const secret = generateBase32Secret();
  const setupDetails = await buildTwoFactorSetupDetails(user.email, secret);

  await adminDb.collection('users').doc(user.id).update({
    pendingTwoFactorSecret: secret,
    updatedAt: new Date().toISOString(),
  });

  await createActivityLog({
    type: 'Two-Factor Setup',
    action: 'Generated a new Google Authenticator setup secret.',
    status: 'info',
    user,
    entityId: user.id,
    entityType: 'user',
  });

  return {
    success: true,
    ...setupDetails,
  };
}

export async function confirmTwoFactorSetup(_: unknown, formData: FormData) {
  const verificationCode = cleanString(formData.get('verificationCode'));
  const user = await requireCurrentUser();
  const userDoc = await adminDb.collection('users').doc(user.id).get();
  const userData = userDoc.data() ?? {};
  const pendingSecret = cleanString(userData.pendingTwoFactorSecret);

  if (!pendingSecret) {
    return { error: 'Generate a Google Authenticator secret before confirming setup.' };
  }

  if (!verifyTotpCode(pendingSecret, verificationCode)) {
    return { error: 'The Google Authenticator verification code is invalid or expired.' };
  }

  await userDoc.ref.update({
    twoFactorEnabled: true,
    twoFactorSecret: pendingSecret,
    pendingTwoFactorSecret: null,
    updatedAt: new Date().toISOString(),
  });

  await createActivityLog({
    type: 'Two-Factor Enabled',
    action: 'Enabled Google Authenticator two-factor authentication.',
    status: 'success',
    user,
    entityId: user.id,
    entityType: 'user',
  });

  revalidatePath('/settings');
  return { success: 'Google Authenticator is now enabled.' };
}

export async function disableTwoFactor() {
  const user = await requireCurrentUser();

  await adminDb.collection('users').doc(user.id).update({
    twoFactorEnabled: false,
    twoFactorSecret: null,
    pendingTwoFactorSecret: null,
    updatedAt: new Date().toISOString(),
  });

  await createActivityLog({
    type: 'Two-Factor Disabled',
    action: 'Disabled Google Authenticator two-factor authentication.',
    status: 'warning',
    user,
    entityId: user.id,
    entityType: 'user',
  });

  revalidatePath('/settings');
  return { success: true };
}

export async function updateNotificationPreferences(formData: FormData) {
  const user = await requireCurrentUser();
  const preferences = {
    stockAlerts: formData.get('stockAlerts') === 'on',
    activityUpdates: formData.get('activityUpdates') === 'on',
    systemNotifications: formData.get('systemNotifications') === 'on',
  };

  await adminDb.collection('users').doc(user.id).update({
    notificationPreferences: preferences,
    updatedAt: new Date().toISOString(),
  });

  await createActivityLog({
    type: 'Notification Settings',
    action: 'Updated notification preferences.',
    status: 'success',
    user,
    entityId: user.id,
    entityType: 'user',
  });

  revalidatePath('/settings');
  return { success: true };
}

export async function deactivateAccount() {
  const user = await requireCurrentUser();

  await adminDb.collection('users').doc(user.id).update({
    active: false,
    updatedAt: new Date().toISOString(),
  });

  const sessions = await adminDb.collection('sessions').where('userId', '==', user.id).get();
  const batch = adminDb.batch();
  sessions.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  await createActivityLog({
    type: 'Account Deactivated',
    action: 'Deactivated the current account.',
    status: 'warning',
    user,
    entityId: user.id,
    entityType: 'user',
  });

  await deleteSession();
  redirect('/sign-in');
}

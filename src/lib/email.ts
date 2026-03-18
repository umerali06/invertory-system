import { headers } from 'next/headers';
import nodemailer from 'nodemailer';
import { normalizeEnvValue } from '@/lib/utils';

type PasswordResetEmailInput = {
  to: string;
  name: string;
  resetUrl: string;
};

async function getBaseUrl() {
  const explicitBaseUrl =
    normalizeEnvValue(process.env.APP_BASE_URL) || normalizeEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') || headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto') || 'http';

  if (host) {
    return `${proto}://${host}`;
  }

  return 'http://localhost:3000';
}

function getTransportConfig() {
  const host = normalizeEnvValue(process.env.SMTP_HOST);
  const port = Number.parseInt(normalizeEnvValue(process.env.SMTP_PORT) || '587', 10);
  const user = normalizeEnvValue(process.env.SMTP_USER);
  const pass = normalizeEnvValue(process.env.SMTP_PASS);
  const from = normalizeEnvValue(process.env.SMTP_FROM);
  const secure = normalizeEnvValue(process.env.SMTP_SECURE) === 'true';

  if (!host || !user || !pass || !from || Number.isNaN(port)) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    from,
  };
}

export async function buildAbsoluteUrl(path: string) {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const transportConfig = getTransportConfig();
  if (!transportConfig) {
    return {
      delivered: false,
      previewUrl: input.resetUrl,
    };
  }

  const transporter = nodemailer.createTransport({
    host: transportConfig.host,
    port: transportConfig.port,
    secure: transportConfig.secure,
    auth: transportConfig.auth,
  });

  await transporter.sendMail({
    from: transportConfig.from,
    to: input.to,
    subject: 'Reset your Shopline Inventory password',
    text: `Hi ${input.name},\n\nUse this link to reset your password:\n${input.resetUrl}\n\nThis link expires in 30 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>Hi ${input.name},</p>
        <p>Use the button below to reset your Shopline Inventory password.</p>
        <p style="margin: 24px 0;">
          <a href="${input.resetUrl}" style="background:#2563eb;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Reset Password</a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
        <p>This link expires in 30 minutes.</p>
      </div>
    `,
  });

  return {
    delivered: true,
    previewUrl: undefined,
  };
}

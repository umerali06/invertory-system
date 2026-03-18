import { format, formatDistanceToNowStrict, isValid, parseISO, subDays, startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import type { NotificationPreferences, ReportRange } from '@/lib/app-types';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  stockAlerts: true,
  activityUpdates: true,
  systemNotifications: false,
};

export function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeIsbn(value: unknown) {
  return cleanString(value).replace(/[^0-9Xx]/g, '').toUpperCase();
}

export function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toPositiveInt(value: unknown, fallback = 0) {
  const parsed = Math.trunc(toNumber(value, fallback));
  return parsed >= 0 ? parsed : fallback;
}

export function safeDate(value: unknown) {
  if (value instanceof Date && isValid(value)) {
    return value;
  }

  if (typeof value === 'string' && value) {
    const parsed = parseISO(value);
    if (isValid(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (isValid(parsed)) {
      return parsed;
    }
  }

  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    const parsed = value.toDate();
    if (parsed instanceof Date && isValid(parsed)) {
      return parsed;
    }
  }

  return new Date(0);
}

export function toIsoString(value: unknown, fallback?: string) {
  const date = safeDate(value);
  if (date.getTime() === 0 && fallback) {
    return fallback;
  }
  return date.toISOString();
}

export function formatDateTime(value: unknown) {
  const date = safeDate(value);
  if (date.getTime() === 0) {
    return 'Unknown time';
  }
  return format(date, 'MMM d, yyyy h:mm a');
}

export function formatDate(value: unknown) {
  const date = safeDate(value);
  if (date.getTime() === 0) {
    return 'Unknown date';
  }
  return format(date, 'MMM d, yyyy');
}

export function formatRelativeTime(value: unknown) {
  const date = safeDate(value);
  if (date.getTime() === 0) {
    return 'Unknown time';
  }
  return `${formatDistanceToNowStrict(date, { addSuffix: false })} ago`;
}

export function buildSku(title: string, isbn: string, fallbackId?: string) {
  const titlePart = cleanString(title)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 10)
    .toUpperCase();
  const codePart = normalizeIsbn(isbn).slice(-6) || fallbackId?.slice(0, 6).toUpperCase() || 'ITEM';
  return `${titlePart || 'ITEM'}-${codePart}`;
}

export function getStockStatus(stock: number, reorderLevel: number) {
  if (stock <= 0) {
    return 'out-of-stock' as const;
  }

  if (stock <= reorderLevel) {
    return 'low-stock' as const;
  }

  return 'in-stock' as const;
}

export function getRangeStart(range: ReportRange) {
  const now = new Date();

  switch (range) {
    case 'today':
      return startOfDay(now);
    case 'this-week':
      return startOfWeek(now, { weekStartsOn: 1 });
    case 'this-month':
      return startOfMonth(now);
    case 'this-year':
      return startOfYear(now);
    case 'all-time':
    default:
      return new Date(0);
  }
}

export function getLastSevenDays() {
  const points: Date[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    points.push(startOfDay(subDays(new Date(), offset)));
  }
  return points;
}

export function getBrowserLabel(userAgent: string) {
  const agent = userAgent.toLowerCase();

  if (agent.includes('edg')) {
    return 'Microsoft Edge';
  }
  if (agent.includes('chrome')) {
    return 'Google Chrome';
  }
  if (agent.includes('firefox')) {
    return 'Mozilla Firefox';
  }
  if (agent.includes('safari')) {
    return 'Safari';
  }
  if (agent.includes('postman')) {
    return 'Postman';
  }

  return 'Browser';
}

export function normalizeEnvValue(value?: string) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

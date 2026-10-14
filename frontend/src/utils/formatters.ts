/**
 * Consistent date and time formatting utility for ResolveHub.
 * Safely parses UTC ISO timestamps and renders in the user's local timezone.
 */

export function parseUtcDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  // If the ISO string does not specify timezone offset (no 'Z' and no '+' or '-HH:MM' offset),
  // assume UTC by appending 'Z' to avoid incorrect local time interpretation.
  const hasTimezone = str.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(str);
  const normalizedStr = hasTimezone ? str : `${str}Z`;

  const d = new Date(normalizedStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(dateStr?: string | null): string {
  const d = parseUtcDate(dateStr);
  if (!d) return '—';

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateStr?: string | null): string {
  const d = parseUtcDate(dateStr);
  if (!d) return '—';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

import { describe, expect, test } from 'vitest';
import { cn, formatCurrency, deriveConversationTitle, formatDate, getOrderStatusLabel } from '../utils';

describe('cn utility', () => {
  test('merges class strings correctly', () => {
    const result = cn('p-4', 'p-2', 'text-center');
    // twMerge should keep the last conflicting utility, so p-2 should win over p-4
    expect(result).toContain('p-2');
    expect(result).toContain('text-center');
    expect(result).not.toContain('p-4');
  });
});

describe('formatCurrency', () => {
  test('handles null and undefined', () => {
    expect(formatCurrency(null)).toBe('Rp 0');
    expect(formatCurrency(undefined)).toBe('Rp 0');
  });

  test('formats numbers and numeric strings', () => {
    expect(formatCurrency(1500000)).toBe('Rp 1.500.000');
    expect(formatCurrency('2000000')).toBe('Rp 2.000.000');
  });

  test('returns Rp 0 for NaN values', () => {
    expect(formatCurrency('abc')).toBe('Rp 0');
    expect(formatCurrency(NaN)).toBe('Rp 0');
  });
});

describe('deriveConversationTitle', () => {
  test('returns whole text when short enough', () => {
    const txt = 'Halo dunia';
    expect(deriveConversationTitle(txt, 20)).toBe(txt);
  });

  test('cuts at max length with ellipsis', () => {
    const long = 'Ini adalah kalimat yang sangat panjang melebihi batas maksimal';
    const result = deriveConversationTitle(long, 20);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21); // max + ellipsis
  });
});

describe('formatDate', () => {
  test('returns dash for falsy values', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined as any)).toBe('-');
  });

  test('formats a valid date string', () => {
    const iso = '2023-01-01T12:34:00Z';
    const formatted = formatDate(iso);
    // Indonesian locale, medium date style, short time style – we only assert it contains expected parts
    expect(formatted).toContain('Jan'); // month abbreviation in ID may be "Jan"
    expect(formatted).toContain('2023');
  });
});

describe('getOrderStatusLabel', () => {
  test('returns correct label and colors for known status', () => {
    const { label, color, bg } = getOrderStatusLabel('CREATED');
    expect(label).toBe('Order Dibuat');
    expect(color).toContain('text-slate-600');
    expect(bg).toContain('bg-slate-100');
  });

  test('falls back to raw status when unknown', () => {
    const unknown = 'UNKNOWN_STATUS';
    const result = getOrderStatusLabel(unknown);
    expect(result.label).toBe(unknown);
    expect(result.color).toBe('text-slate-600');
    expect(result.bg).toBe('bg-slate-100');
  });
});


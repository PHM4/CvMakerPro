import type { ContactItem, DateRange, YearMonth } from './document';

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export type DateStyle = 'short' | 'long' | 'numeric' | 'yearOnly';

/**
 * An en dash with hair spaces, not a hyphen. On a printed page a hyphen between two
 * dates reads as a typo, and it is the sort of thing the people reading CVs notice.
 */
const RANGE_SEPARATOR = ' – ';

export function formatYearMonth(value: YearMonth, style: DateStyle = 'short'): string {
  const monthIndex = Math.min(Math.max(value.month, 1), 12) - 1;
  switch (style) {
    case 'short':
      return `${MONTHS_SHORT[monthIndex]} ${value.year}`;
    case 'long':
      return `${MONTHS_LONG[monthIndex]} ${value.year}`;
    case 'numeric':
      return `${String(value.month).padStart(2, '0')}/${value.year}`;
    case 'yearOnly':
      return String(value.year);
  }
}

export function formatDateRange(range: DateRange, style: DateStyle = 'short'): string {
  const start = formatYearMonth(range.start, style);
  const end = range.end ? formatYearMonth(range.end, style) : 'Present';

  // A single-month engagement reads better as one date than as "Jun 2025 – Jun 2025".
  if (range.end && start === end) {
    return start;
  }

  return `${start}${RANGE_SEPARATOR}${end}`;
}

/**
 * Contacts print as text, not as icons — icon rows are the first thing an applicant
 * tracking system throws away, and a phone number is not improved by a glyph.
 */
export function contactHref(contact: ContactItem): string | undefined {
  if (contact.href) {
    return contact.href;
  }

  const value = contact.value.trim();
  if (value === '') {
    return undefined;
  }

  switch (contact.kind) {
    case 'email':
      return `mailto:${value}`;
    case 'phone':
      return `tel:${value.replace(/[^+\d]/g, '')}`;
    case 'website':
    case 'linkedIn':
    case 'gitHub':
      return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    default:
      return undefined;
  }
}

/** Strips the protocol and any trailing slash so a URL reads as a label on paper. */
export function contactLabel(contact: ContactItem): string {
  const value = contact.value.trim();
  if (contact.kind === 'website' || contact.kind === 'linkedIn' || contact.kind === 'gitHub') {
    return value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  return value;
}

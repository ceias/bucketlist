import { format, isValid, parseISO } from 'date-fns';
import type { Item } from '../stores/data';
export type ParsedGoal = { title: string; date: string; category: string; body: string; line: number; duplicate: boolean; precision: 'month' | 'day' };
export type ImportIssue = { line: number; message: string };
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const validISO = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && isValid(parseISO(date)) && format(parseISO(date), 'yyyy-MM-dd') === date;
const key = (title: string, date: string) => `${date}|${title.trim().toLocaleLowerCase().replace(/\s+/g, ' ')}`;

/** Deliberately deterministic: dates we cannot recognize stay in the review instead of being guessed. */
export function parseBulkGoals(text: string, defaultMonth: string, existing: (Pick<Item, 'title' | 'date'> & { data?: Item['data'] })[] = []) {
  const rows: ParsedGoal[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set(existing.map(i => key(i.title, i.data?.datePrecision === 'month' ? i.date.slice(0,7) : i.date)));
  let date = defaultMonth + '-01';
  let theme = '';
  const lines = text.split(/\r?\n/);
  if (lines.length > 500) return { rows, issues: [{ line: 501, message: 'Paste up to 500 lines at a time.' }] };
  if (!validISO(date)) return { rows, issues: [{ line: 0, message: 'Choose a valid default month.' }] };
  lines.forEach((raw, index) => {
    const line = index + 1;
    let value = raw.trim().replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
    if (!value || /^[-_*]{3,}$/.test(value)) return;
    const monthHeader = value.match(/^([a-z]+)(?:\s+(\d{4}))?(?:\s*[:—–-]\s*(.*))?\s*:?$/i);
    const numericHeader = value.match(/^(\d{4}-\d{2})(?:\s*[:—–]\s*(.*))?\s*:?$/);
    if (monthHeader && months.some(m => m === monthHeader[1].toLowerCase() || m.slice(0,3) === monthHeader[1].toLowerCase())) {
      const m = months.findIndex(m => m === monthHeader[1].toLowerCase() || m.slice(0,3) === monthHeader[1].toLowerCase());
      date = `${monthHeader[2] || defaultMonth.slice(0,4)}-${String(m + 1).padStart(2,'0')}-01`; theme = monthHeader[3] || ''; return;
    }
    if (numericHeader) {
      if (!validISO(numericHeader[1] + '-01')) { issues.push({ line, message: 'This month does not exist.' }); return; }
      date = numericHeader[1] + '-01'; theme = numericHeader[2] || ''; return;
    }
    value = value.replace(/^(?:[-*•]\s+|\d+[.)]\s+)(?:\[[ xX]\]\s*)?/, '').trim();
    let rowDate = date;
    let precision: 'month' | 'day' = 'month';
    // Both `2027-02-13 | Dinner | Food` and `Dinner | 2027-02-13 | Food` are accepted.
    const parts = value.split('|').map(p => p.trim());
    let title = parts[0];
    let category = 'Monthly goals';
    let body = theme;
    if (/^\d{4}-\d{2}-\d{2}/.test(title)) {
      const prefix = title.match(/^(\d{4}-\d{2}-\d{2})(?:\s*[:—–]\s*|\s+)?(.*)$/)!;
      rowDate = prefix[1]; precision = 'day';
      if (prefix[2]) { title = prefix[2]; category = parts[1] || category; body = parts.slice(2).join(' | ') || theme; }
      else { title = parts[1] || ''; category = parts[2] || category; body = parts.slice(3).join(' | ') || theme; }
    } else if (parts[1] && /^\d{4}-/.test(parts[1])) {
      rowDate = parts[1]; precision = 'day'; category = parts[2] || category; body = parts.slice(3).join(' | ') || theme;
    } else { category = parts[1] || category; body = parts.slice(2).join(' | ') || theme; }
    if (!validISO(rowDate)) { issues.push({ line, message: 'Use a real date in YYYY-MM-DD format.' }); return; }
    if (!title || title.length > 200) { issues.push({ line, message: 'Each goal needs a title between 1 and 200 characters.' }); return; }
    const identity = key(title, precision === 'month' ? rowDate.slice(0,7) : rowDate);
    rows.push({ title, date: rowDate, category, body, line, precision, duplicate: seen.has(identity) });
    seen.add(identity);
  });
  if (rows.filter(row => !row.duplicate).length > 200) issues.push({ line: 0, message: 'Import up to 200 new goals at a time.' });
  return { rows, issues };
}

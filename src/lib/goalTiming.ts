import { format, parseISO } from 'date-fns';
import type { Item } from '../stores/data';

// The DATE column retains a month anchor for compatibility; precision determines whether it is a scheduled day.
export const isMonthGoal = (item: Pick<Item, 'kind' | 'data'>) => item.kind === 'bucket' && item.data.datePrecision === 'month';
export const goalMonth = (item: Pick<Item, 'date' | 'data'>) => String(item.data.targetMonth || item.date.slice(0, 7));
export function goalDateLabel(item: Item) {
  return isMonthGoal(item) ? format(parseISO(goalMonth(item) + '-01'), 'MMMM yyyy') + ' · any day' : format(parseISO(item.date), 'MMM d, yyyy');
}
export function makeMonthOnly(item: Item): Item {
  const month = item.date.slice(0, 7);
  return { ...item, date: month + '-01', data: { ...item.data, datePrecision: 'month', targetMonth: month } };
}

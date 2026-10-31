import { format, isValid, parseISO } from 'date-fns';
import { goalMonth, isMonthGoal } from './goalTiming';
import type { Item } from '../stores/data';

export function calendarItems(items: Item[]) {
  return items.filter(item => !item.deleted && !isMonthGoal(item) && item.date && isValid(parseISO(item.date)) &&
    (item.kind === 'calendar' || item.kind === 'dates' || (item.kind === 'bucket' && item.data.showOnCalendar)));
}
export function agendaOnDate(items: Item[], date: string) {
  return calendarItems(items).filter(item => item.date === date)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title));
}
export function upcomingAgenda(items: Item[], now = new Date()) {
  const today = format(now, 'yyyy-MM-dd');
  return [...calendarItems(items).filter(item => item.date >= today && !item.done), ...items.filter(item => !item.deleted && !item.done && isMonthGoal(item) && item.data.showOnCalendar && goalMonth(item) >= today.slice(0,7))]
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function monthlyAgenda(items: Item[], month: string) {
  return items.filter(item => !item.deleted && isMonthGoal(item) && item.data.showOnCalendar && goalMonth(item) === month).sort((a,b) => Number(a.done)-Number(b.done) || a.title.localeCompare(b.title));
}

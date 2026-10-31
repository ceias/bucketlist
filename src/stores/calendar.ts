import { create } from 'zustand';
import { format } from 'date-fns';
export const useCalendar = create<{ date: string; select: (date: string) => void }>(set => ({
  date: format(new Date(), 'yyyy-MM-dd'), select: date => set({ date }),
}));

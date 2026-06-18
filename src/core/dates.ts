/** dates.ts — wrappers de date-fns con locale es. */
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDate,
  isSameDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from 'date-fns';
import { es } from 'date-fns/locale';

/** Hoy en formato YYYY-MM-DD (fecha local). */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Mes actual en formato YYYY-MM. */
export function currentYearMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

/** YYYY-MM de una fecha ISO (YYYY-MM-DD). */
export function yearMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function formatLongDate(isoDate: string): string {
  return format(parseISO(isoDate), "d 'de' MMMM yyyy", { locale: es });
}

export function formatDayMonth(isoDate: string): string {
  return format(parseISO(isoDate), "d 'de' MMM", { locale: es });
}

export function formatMonthLabel(yearMonth: string): string {
  return format(parseISO(`${yearMonth}-01`), 'MMMM yyyy', { locale: es });
}

export function daysInMonth(yearMonth: string): number {
  return getDaysInMonth(parseISO(`${yearMonth}-01`));
}

/** Días transcurridos del mes (hoy incluido) si es el mes en curso; si no, el mes completo. */
export function elapsedDaysInMonth(yearMonth: string): number {
  if (yearMonth === currentYearMonth()) return getDate(new Date());
  return daysInMonth(yearMonth);
}

export function monthBounds(yearMonth: string): { start: string; end: string } {
  const ref = parseISO(`${yearMonth}-01`);
  return {
    start: format(startOfMonth(ref), 'yyyy-MM-dd'),
    end: format(endOfMonth(ref), 'yyyy-MM-dd'),
  };
}

/** Alias para uso en listas: "Hoy", "Ayer", o "d de MMMM". */
export function formatDate(isoDate: string): string {
  const d = parseISO(isoDate);
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  if (isoDate === today) return 'Hoy';
  if (isoDate === yesterday) return 'Ayer';
  return format(d, "d 'de' MMMM", { locale: es });
}

export { isSameDay, addDays, addWeeks, addMonths, addYears, parseISO, format };

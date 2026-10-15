import { getISOWeek, getISOWeekYear } from 'date-fns';

export function isoWeek(date: Date): string {
    const utcCalendarDate = new Date(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
    );
    const year = getISOWeekYear(utcCalendarDate);
    const week = getISOWeek(utcCalendarDate);
    return `${year}-W${String(week).padStart(2, '0')}`;
}

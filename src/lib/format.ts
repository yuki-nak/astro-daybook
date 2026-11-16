import { site } from '../site.config';

// Entry dates are calendar dates (YYYY-MM-DD) stored as UTC midnight, so format them in UTC.
const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(site.locale, { timeZone: 'UTC', ...options });

const fullDate = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const monthDay = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const monthYear = fmt({ month: 'long', year: 'numeric' });
const shortWeekday = fmt({ weekday: 'short' });
const shortDate = fmt({ day: 'numeric', month: 'short', year: 'numeric' });

export function dateParts(d: Date) {
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: shortWeekday.format(d),
  };
}

/** YYYY-MM-DD */
export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday 16 November 2026 */
export function formatDate(d: Date): string {
  return fullDate.format(d);
}

/** Mon 16 Nov */
export function formatMonthDay(d: Date): string {
  return monthDay.format(d);
}

/** November 2026 */
export function formatMonthYear(d: Date): string {
  return monthYear.format(d);
}

/** 16 Nov 2026 */
export function formatShortDate(d: Date): string {
  return shortDate.format(d);
}

export interface DayWeather {
  code: number | null;
  max: number | null;
  min: number | null;
}

/** WMO weather code → words */
export function weatherWord(code: number | null | undefined): string | undefined {
  if (code === null || code === undefined) return undefined;
  if (code <= 1) return 'Sunny';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code === 65 || code === 67) return 'Heavy rain';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return undefined;
}

/** 18°C / 9°C */
export function tempText(w: DayWeather | undefined): string | undefined {
  if (!w || w.max === null || w.min === null) return undefined;
  return `${Math.round(w.max)}°C / ${Math.round(w.min)}°C`;
}

/** A short plain-text opening of the body, for lists */
export function excerpt(markdown: string, length = 80): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const space = cut.lastIndexOf(' ');
  return (space > length * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, '') + '…';
}

export function hasImage(markdown: string): boolean {
  return /!\[[^\]]*\]\([^)]*\)/.test(markdown);
}

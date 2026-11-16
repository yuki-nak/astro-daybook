// Weather and temperature.
// Settled days are stored in src/data/weather.json (GitHub Actions appends yesterday every night).
// Only days missing from it (today, days not yet settled) are fetched from Open-Meteo at build time.
// A failed fetch never stops the build; the page just shows no weather.
import { site } from '../site.config';
import type { DayWeather } from './format';
import saved from '../data/weather.json';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A WMO weather code is an integer 0–99; anything else becomes null */
function toCode(v: unknown): number | null {
  return Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 99 ? (v as number) : null;
}

/** Accept only plausible temperatures (°C) */
function toTemp(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v > -60 && v < 60 ? v : null;
}

function toDayWeather(v: unknown): DayWeather {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return { code: toCode(o.code), max: toTemp(o.max), min: toTemp(o.min) };
}

// Saved values are validated too, like any outside data
// The build runs on Node; read env vars without pulling in @types/node
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

const store: Record<string, DayWeather> = Object.fromEntries(
  Object.entries(saved as Record<string, unknown>)
    .filter(([k]) => DATE.test(k))
    .map(([k, v]) => [k, toDayWeather(v)]),
);
const DAILY = 'weather_code,temperature_2m_max,temperature_2m_min';

function query(): string {
  const { latitude, longitude } = site.location;
  return `latitude=${latitude}&longitude=${longitude}&daily=${DAILY}&timezone=${encodeURIComponent(site.timezone)}`;
}

function shift(key: string, days: number): string {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date (YYYY-MM-DD) in the site's time zone */
export function todayLocal(): string {
  // en-CA formats dates as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: site.timezone }).format(new Date());
}

/** Whether a day is saved (settled) */
export function isSaved(key: string): boolean {
  return key in store;
}

async function fetchDaily(url: string): Promise<Map<string, DayWeather>> {
  const map = new Map<string, DayWeather>();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.warn(`[weather] ${res.status} ${url}`);
      return map;
    }
    const daily = (await res.json())?.daily;
    if (!Array.isArray(daily?.time)) return map;
    daily.time.forEach((t: unknown, i: number) => {
      if (typeof t !== 'string' || !DATE.test(t)) return;
      map.set(
        t,
        toDayWeather({
          code: daily.weather_code?.[i],
          max: daily.temperature_2m_max?.[i],
          min: daily.temperature_2m_min?.[i],
        }),
      );
    });
  } catch (err) {
    console.warn('[weather] fetch failed', err);
  }
  return map;
}

function hasData(w: DayWeather | undefined): boolean {
  return !!w && (w.code !== null || w.max !== null || w.min !== null);
}

export async function getWeather(keys: string[]): Promise<Map<string, DayWeather>> {
  const result = new Map<string, DayWeather>();
  const today = todayLocal();
  const missing: string[] = [];

  for (const k of new Set(keys)) {
    if (store[k]) result.set(k, store[k]);
    else if (k <= today) missing.push(k);
  }
  if (!missing.length || env.SKIP_WEATHER) return result;
  missing.sort();

  // The forecast API covers the last ~90 days; older days come from the archive API
  const recentFrom = shift(today, -90);
  const old = missing.filter((k) => k < recentFrom);
  const tasks: Promise<Map<string, DayWeather>>[] = [];
  if (missing.some((k) => k >= recentFrom)) {
    tasks.push(fetchDaily(`https://api.open-meteo.com/v1/forecast?${query()}&past_days=92&forecast_days=1`));
  }
  if (old.length) {
    tasks.push(
      fetchDaily(
        `https://archive-api.open-meteo.com/v1/archive?${query()}&start_date=${old[0]}&end_date=${old[old.length - 1]}`,
      ),
    );
  }

  const want = new Set(missing);
  for (const map of await Promise.all(tasks)) {
    for (const [k, v] of map) {
      if (want.has(k) && hasData(v) && !hasData(result.get(k))) result.set(k, v);
    }
  }
  return result;
}

#!/usr/bin/env node
// For every day that has an entry, up to yesterday, fetch the weather from Open-Meteo
// and save it to src/data/weather.json. A saved day is never fetched again.
// Run nightly by GitHub Actions (.github/workflows/weather.yml).
// Usage: node tools/update-weather.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const STORE = join(ROOT, 'src/data/weather.json');
const CONTENT_DIRS = ['src/content/posts', 'src/content/notes', 'src/content/works'];

const config = readFileSync(join(ROOT, 'src/site.config.ts'), 'utf8');
const latitude = Number(config.match(/latitude:\s*(-?[\d.]+)/)?.[1]);
const longitude = Number(config.match(/longitude:\s*(-?[\d.]+)/)?.[1]);
const timezone = config.match(/timezone:\s*'([^']+)'/)?.[1] ?? 'UTC';
if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Could not read latitude/longitude from src/site.config.ts');

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.md') ? [p] : [];
  });
}

function contentDates() {
  const dates = new Set();
  for (const dir of CONTENT_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const fm = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
      const m = fm?.[1].match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m);
      if (m) dates.add(m[1]);
    }
  }
  return dates;
}

const shift = (key, days) => {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
// Today in the site's time zone (en-CA formats as YYYY-MM-DD)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());

const store = existsSync(STORE) ? JSON.parse(readFileSync(STORE, 'utf8')) : {};
const targets = [...contentDates()].filter((k) => k < today && !store[k]).sort();
if (!targets.length) {
  console.log('Nothing new to settle');
  process.exit(0);
}

const q = `latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(timezone)}`;
const recentFrom = shift(today, -90);
const urls = [];
if (targets.some((k) => k >= recentFrom)) {
  urls.push(`https://api.open-meteo.com/v1/forecast?${q}&past_days=92&forecast_days=1`);
}
const old = targets.filter((k) => k < recentFrom);
if (old.length) {
  urls.push(`https://archive-api.open-meteo.com/v1/archive?${q}&start_date=${old[0]}&end_date=${old.at(-1)}`);
}

// Validate what the API returns before saving: WMO codes are integers 0–99, temperatures must be plausible
const isCode = (v) => Number.isInteger(v) && v >= 0 && v <= 99;
const isTemp = (v) => typeof v === 'number' && Number.isFinite(v) && v > -60 && v < 60;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const fetched = new Map();
for (const url of urls) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`${res.status}`);
    const daily = (await res.json())?.daily;
    if (!Array.isArray(daily?.time)) throw new Error('response has no daily.time');
    daily.time.forEach((t, i) => {
      const w = {
        code: daily.weather_code?.[i],
        max: daily.temperature_2m_max?.[i],
        min: daily.temperature_2m_min?.[i],
      };
      if (!isDate(t) || fetched.has(t)) return;
      if (isCode(w.code) && isTemp(w.max) && isTemp(w.min) && w.min <= w.max) fetched.set(t, w);
      else console.warn(`Invalid values, not saved: ${t}`, JSON.stringify(w));
    });
  } catch (err) {
    console.warn(`Fetch failed: ${url}`, err.message ?? err);
  }
}

const added = targets.filter((k) => fetched.has(k));
for (const k of added) store[k] = fetched.get(k);

// One line per day keeps diffs readable
const keys = Object.keys(store).sort();
const body = keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(store[k])}`).join(',\n');
writeFileSync(STORE, keys.length ? `{\n${body}\n}\n` : '{}\n');

console.log(added.length ? `Saved: ${added.join(', ')}` : 'Nothing could be saved');
const failed = targets.filter((k) => !fetched.has(k));
if (failed.length) console.log(`Could not fetch: ${failed.join(', ')}`);

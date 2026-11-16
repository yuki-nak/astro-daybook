import { getCollection, type CollectionEntry } from 'astro:content';
import { site as siteConfig, shelves, type ShelfKey } from '../site.config';
import { dateKey, excerpt, hasImage, tempText, weatherWord, type DayWeather } from './format';
import { getWeather, todayLocal } from './weather';

export interface Weather {
  /** For lists (Sunny) */
  word?: string;
  /** 18°C / 9°C */
  temp?: string;
  /** The day isn't over yet (includes forecast values) */
  tentative: boolean;
}

type ShelfEntry = CollectionEntry<'notes'> | CollectionEntry<'works'>;
type NoteEntry = CollectionEntry<'noteDays'> | CollectionEntry<'workDays'>;

export interface DiaryItem {
  type: 'diary';
  entry: CollectionEntry<'posts'>;
  date: Date;
  key: string;
  url: string;
  weather: Weather;
  excerpt: string;
  photo: boolean;
}

export interface NoteItem {
  type: 'note';
  entry: NoteEntry;
  date: Date;
  key: string;
  url: string;
  weather: Weather;
  work: Work;
  photo: boolean;
}

export interface Work {
  shelf: ShelfKey;
  slug: string;
  entry: ShelfEntry;
  url: string;
  /** Title for lists and headings (quoted for notes) */
  name: string;
  /** Oldest first */
  notes: NoteItem[];
  first?: Date;
  last?: Date;
}

export type TimelineItem = DiaryItem | NoteItem;

export interface Site {
  diary: DiaryItem[];
  shelves: Record<ShelfKey, Work[]>;
  timeline: TimelineItem[];
}

const SOURCES = {
  notes: { items: 'notes', days: 'noteDays' },
  works: { items: 'works', days: 'workDays' },
} as const;

let cache: Promise<Site> | undefined;

/** Load once per build */
export function getSite(): Promise<Site> {
  cache ??= load();
  return cache;
}

function parentDir(entry: NoteEntry): string {
  const parts = (entry.filePath ?? entry.id).replace(/\\/g, '/').split('/');
  return parts[parts.length - 2];
}

function makeWeather(key: string, today: string, manual: string | undefined, auto: DayWeather | undefined): Weather {
  if (manual) return { word: manual, tentative: false };
  if (key > today) return { tentative: false };
  return { word: weatherWord(auto?.code), temp: tempText(auto), tentative: key === today && !!auto };
}

async function load(): Promise<Site> {
  const posts = await getCollection('posts', (e) => !e.data.draft);
  const raw = {} as Record<ShelfKey, { items: ShelfEntry[]; notes: NoteEntry[] }>;
  for (const key of Object.keys(SOURCES) as ShelfKey[]) {
    const src = SOURCES[key];
    raw[key] = {
      items: (await getCollection(src.items, (e: ShelfEntry) => !e.data.draft)) as ShelfEntry[],
      notes: (await getCollection(src.days, (e: NoteEntry) => !e.data.draft)) as NoteEntry[],
    };
  }

  const today = todayLocal();
  const keys = [
    ...posts.filter((p) => !p.data.weather).map((p) => dateKey(p.data.date)),
    ...Object.values(raw).flatMap((r) => r.notes.map((n) => dateKey(n.data.date))),
  ];
  const wx = await getWeather(keys);

  const diary: DiaryItem[] = posts
    .map((entry) => {
      const key = dateKey(entry.data.date);
      const body = entry.body ?? '';
      return {
        type: 'diary' as const,
        entry,
        date: entry.data.date,
        key,
        url: `/posts/${entry.id}/`,
        weather: makeWeather(key, today, entry.data.weather, wx.get(key)),
        excerpt: excerpt(body),
        photo: hasImage(body),
      };
    })
    .sort((a, b) => b.date.valueOf() - a.date.valueOf() || b.entry.id.localeCompare(a.entry.id));

  const result = {} as Record<ShelfKey, Work[]>;
  const allNotes: NoteItem[] = [];

  for (const shelf of Object.keys(SOURCES) as ShelfKey[]) {
    const cfg = shelves[shelf];
    const map = new Map<string, Work>();
    for (const entry of raw[shelf].items) {
      map.set(entry.id, {
        shelf,
        slug: entry.id,
        entry,
        url: `${cfg.path}${entry.id}/`,
        name: cfg.quoteTitle ? `“${entry.data.title}”` : entry.data.title,
        notes: [],
      });
    }
    for (const entry of raw[shelf].notes) {
      const work = map.get(parentDir(entry));
      if (!work) {
        console.warn(`[${cfg.label}] no matching item page for: ${entry.filePath}`);
        continue;
      }
      const key = dateKey(entry.data.date);
      const note: NoteItem = {
        type: 'note',
        entry,
        date: entry.data.date,
        key,
        url: `${work.url}#d-${key}`,
        weather: makeWeather(key, today, undefined, wx.get(key)),
        work,
        photo: hasImage(entry.body ?? ''),
      };
      work.notes.push(note);
      allNotes.push(note);
    }
    for (const w of map.values()) {
      w.notes.sort((a, b) => a.date.valueOf() - b.date.valueOf());
      w.first = w.notes[0]?.date;
      w.last = w.notes[w.notes.length - 1]?.date;
    }
    result[shelf] = [...map.values()].sort(
      (a, b) =>
        (b.last?.valueOf() ?? 0) - (a.last?.valueOf() ?? 0) ||
        a.entry.data.title.localeCompare(b.entry.data.title, siteConfig.locale),
    );
  }

  const timeline: TimelineItem[] = [...diary, ...allNotes].sort(
    (a, b) => b.date.valueOf() - a.date.valueOf() || (a.type === b.type ? 0 : a.type === 'diary' ? -1 : 1),
  );

  return { diary, shelves: result, timeline };
}

export function allTags(site: Site): [string, number][] {
  const counts = new Map<string, number>();
  const add = (tags: string[]) => tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
  site.diary.forEach((d) => add(d.entry.data.tags));
  Object.values(site.shelves).forEach((ws) => ws.forEach((w) => add(w.entry.data.tags)));
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], siteConfig.locale));
}

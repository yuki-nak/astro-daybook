import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { shelves } from './site.config';

/** Diary: src/content/posts/YYYY-MM-DD.md */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string().optional(),
    tags: z.array(z.string()).default([]),
    // Written by hand, this wins over the fetched weather (e.g. "rain, then sun")
    weather: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const shelfItem = (statuses: readonly [string, ...string[]]) =>
  z.object({
    kind: z.string(),
    title: z.string(),
    creator: z.string().optional(),
    status: z.enum(statuses).default(statuses[0]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  });

const dated = z.object({
  date: z.coerce.date(),
  draft: z.boolean().default(false),
});

/** Notes on things you read, watch or listen to — one item: src/content/notes/<slug>.md */
const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: shelfItem(shelves.notes.statuses),
});

/** Dated entries for a note: src/content/notes/<slug>/YYYY-MM-DD.md */
const noteDays = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/notes' }),
  schema: dated,
});

/** Things you make (software, electronics, music, a garden…) — one project: src/content/works/<slug>.md */
const works = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/works' }),
  schema: shelfItem(shelves.works.statuses),
});

/** Dated log entries for a project: src/content/works/<slug>/YYYY-MM-DD.md */
const workDays = defineCollection({
  loader: glob({ pattern: '*/*.md', base: './src/content/works' }),
  schema: dated,
});

export const collections = { posts, notes, noteDays, works, workDays };

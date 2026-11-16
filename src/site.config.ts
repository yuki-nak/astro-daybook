export const site = {
  title: 'Daybook',
  description: 'A daily journal, notes on what I read and watch, and a log of things I make.',
  /** BCP 47 language tag for <html lang> and date formatting */
  locale: 'en-GB',
  /**
   * Where the weather comes from (Open-Meteo, no API key needed).
   * tools/update-weather.mjs reads these values too.
   * Pick a city-level point, not your home: the coordinates end up in the public HTML and repository.
   */
  location: {
    name: 'London',
    latitude: 51.5072,
    longitude: -0.1276,
  },
  /** IANA time zone used to decide what "today" is */
  timezone: 'Europe/London',
};

/**
 * Shelves: one page per item (a book, a film, a project…) with dated entries appended over time.
 * Change a label to rename it in the menu and headings.
 */
export const shelves = {
  notes: {
    label: 'Notes',
    path: '/notes/',
    statuses: ['in progress', 'finished'],
    quoteTitle: true, // show titles as “Title”
  },
  works: {
    label: 'Making',
    path: '/works/',
    statuses: ['active', 'wrapped up', 'paused'],
    quoteTitle: false,
  },
} as const;

export type ShelfKey = keyof typeof shelves;

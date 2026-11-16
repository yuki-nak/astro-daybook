# Daybook

A quiet personal website for a daily journal, notes on what you read and watch, and a log of things you make. Built with [Astro](https://astro.build/) as a fully static site, with the day's weather added automatically.

- **Diary** — one short entry per day
- **Notes** — one page per book, film, album or exhibition, with dated thoughts appended as you go
- **Making** — one page per project (software, a garden, bread…), with dated log entries
- Weather and temperature for each day from [Open-Meteo](https://open-meteo.com/) (no API key)
- Tags, a timeline of everything, light and dark themes, no client-side framework
- Security headers (CSP and friends) for Cloudflare Pages in `public/_headers`

It is designed to be written by talking: tell an assistant such as Claude what happened today, it drafts the entry following [`CLAUDE.md`](CLAUDE.md), checks anything sensitive with you, and pushes once you approve. You can just as well write the Markdown files yourself.

## Getting started

Requires Node.js 26 (see `.node-version`).

```sh
npm install
npm run dev        # http://localhost:4321
```

Set `SKIP_WEATHER=1` to skip fetching weather while developing.

### Make it yours

1. Edit `src/site.config.ts`: site title, description, locale, and the place and time zone used for the weather. **Use a city-level point, not your home** — the coordinates are public.
2. Delete the example entries in `src/content/` (they're tagged `example`).
3. In `.github/workflows/weather.yml`, set the cron time to just after midnight in your time zone.
4. Adjust `CLAUDE.md` if you use an assistant to write entries — for example the tone of voice, or what to check before publishing.

## Writing entries

| Kind   | Item page                   | Dated entries                            |
| ------ | --------------------------- | ---------------------------------------- |
| Diary  | —                           | `src/content/posts/YYYY-MM-DD.md`        |
| Notes  | `src/content/notes/<slug>.md` | `src/content/notes/<slug>/YYYY-MM-DD.md` |
| Making | `src/content/works/<slug>.md` | `src/content/works/<slug>/YYYY-MM-DD.md` |

Frontmatter fields and conventions are described in [`CLAUDE.md`](CLAUDE.md). Add `draft: true` to any entry to keep it off the site (it still lives in the repository).

### Photos

Run photos through `tools/prep_image.py` before adding them. It fixes rotation, resizes to 1600px and removes EXIF data, including GPS location:

```sh
pip install pillow pillow-heif   # pillow-heif only for iPhone HEIC photos
python3 tools/prep_image.py IMG_1234.HEIC src/content/posts/images/2026-03-14-1.jpg
```

## Deploying to Cloudflare Pages

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version comes from `.node-version`

`public/_headers` sets a strict Content Security Policy. It allows Cloudflare Web Analytics; remove those entries if you don't use it, and add an origin there if you embed anything from another site.

## How the weather works

At build time, each day with an entry gets the weather for the configured place. Days that aren't over yet are marked "(forecast)".

Every night, `.github/workflows/weather.yml` runs `tools/update-weather.mjs`, which saves observed weather for past days to `src/data/weather.json` and commits it. That commit triggers a rebuild, so forecasts are replaced by observed values. A saved day is never fetched again, so API calls don't grow with the number of entries. Values from the API are validated before they're saved or displayed.

The workflow needs **Settings → Actions → General → Workflow permissions** to allow read and write access, or it can't push the weather commit.

## Privacy checklist

This is a public site and a public repository. Before you publish:

- Weather coordinates are city-level, not your home.
- Photos have gone through `tools/prep_image.py`.
- Remember that `draft: true` entries and deleted entries remain readable in the Git history of a public repository.

## License

[MIT](LICENSE). The example entries are yours to replace; *Walden* is in the public domain.

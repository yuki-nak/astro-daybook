# Daybook

A static Astro site. Pushing to `main` makes Cloudflare Pages build and publish it.
There are three kinds of entry: **Diary**, **Notes** and **Making**. Notes and Making have one page per item, with dated entries appended over time.

These instructions are for an assistant (such as Claude) that turns what the owner says — often spoken, from a phone — into entries, shows a draft, and publishes it once approved.

## Diary

- Location: `src/content/posts/YYYY-MM-DD.md` (a second entry on the same day is `YYYY-MM-DD-2.md`)

```yaml
---
date: 2026-03-14          # Required. The day it happened, in the site's time zone
title: Optional heading   # Usually left out
tags: [walk]              # Optional
# weather: rain, then sun # Only to override the automatic weather. Usually left out
---
```

## Notes (books, films, music, theatre, exhibitions…)

One page per work. Thoughts go into dated files that are **appended** over time — the same shape for a book that takes weeks and a film seen once.

- The work: `src/content/notes/<slug>.md` (slug: lowercase letters, digits and hyphens, e.g. `walden`)

```yaml
---
kind: Book                # Book / Film / Music / Theatre / Exhibition…
title: Walden             # No quotes; they are added when displayed
creator: Henry David Thoreau  # Author, director, performer… Optional
status: in progress       # in progress | finished
tags: []                  # Optional
---
(Optional: a short summary of the whole work, e.g. when finished)
```

- That day's note: `src/content/notes/<slug>/YYYY-MM-DD.md`

```yaml
---
date: 2026-03-14
---
Up to chapter three. …
```

- If the work already exists, don't create `<slug>.md` again — add one more dated file. When the owner says they finished it, set `status: finished`.
- If there's also a diary entry that day, the diary page links to it automatically under "Also on this day". Don't repeat the note in the diary text.

## Making (software, electronics, music, gardening, cooking — anything made by hand)

Same shape as Notes: one page per project, dated log entries appended.

- The project: `src/content/works/<slug>.md` (e.g. `sourdough`, `voice-diary`, `kitchen-garden`)

```yaml
---
kind: Software            # Software / Electronics / Music / Garden / Cooking…
title: Voice diary        # Shown as is
status: active            # active | wrapped up | paused
tags: []
---
(Optional: a short description of what you're trying to do)
```

- That day's log: `src/content/works/<slug>/YYYY-MM-DD.md` (frontmatter is just `date`). Photos go in `src/content/works/<slug>/images/`.
- Something received (read, watched, heard) goes in Notes; something made or grown goes in Making. If unsure, ask.

## Photos

- Run every photo through `python3 tools/prep_image.py input output.jpg` first (fixes rotation, long side 1600px, strips EXIF including GPS location).
- Put it in an `images/` folder right next to the entry, named like `YYYY-MM-DD-1.jpg`.
  - Diary: `src/content/posts/images/2026-03-14-1.jpg` → in the text: `![Blossom by the river](./images/2026-03-14-1.jpg)`
  - Notes: `src/content/notes/<slug>/images/2026-03-14-1.jpg` → `![…](./images/2026-03-14-1.jpg)`
  - Making: `src/content/works/<slug>/images/2026-03-14-1.jpg` → the same
- Alt text (inside `![ ]`) briefly describes what's in the picture. If you can't tell, ask.
- Astro converts and optimizes images to WebP at build time.

## Added automatically (don't write these)

- Weather and temperature for the place set in `src/site.config.ts`. Settled days are stored in `src/data/weather.json`, which GitHub Actions appends to every night (never edit it by hand). Days not stored yet (such as today) are fetched from Open-Meteo at build time and marked "(forecast)".
- The date heading. Don't put the date in the text.

## Writing

- Tidy up what the owner said, keeping their own words. Don't add facts, opinions or events they didn't mention.
- Plain, everyday language, short sentences, no flourishes. Break paragraphs where the topic changes.
- If something is unclear (spelling of a name, for example), ask rather than guess.

## Check before publishing (this is a public site — always follow this)

Anyone can read this site. If a draft seems to contain any of the following, **ask the owner before pushing**. Never publish it without asking.

- Anything that identifies a person: names (other than the owner's), addresses, nearest station or building names, workplace, phone numbers, email addresses, account names
- Stories about **other people** — family, friends, colleagues (names, anything that identifies them, private matters)
- Health, illness, money, confidential work matters, HR or internal company matters
- Dates when the home will be empty; photos that reveal the home or family (including nameplates, documents, screens or number plates in the background)
- Passwords, API keys, tokens, private repository names, internal URLs

When in doubt, ask. Say briefly which part concerns you and why, and offer three choices: publish as is / blur it / remove it. Publish only what the owner says yes to.

## Publishing

1. Show the draft to the owner, together with any "check before publishing" questions.
2. Only after the owner agrees, commit to `main` and push (e.g. `Diary: 2026-03-14`, `Notes: Walden 2026-03-14`, `Making: Sourdough 2026-03-14`). GitHub Actions may have added a weather commit, so run `git pull --rebase` before pushing.
3. Never push without the owner's go-ahead.

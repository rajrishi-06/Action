<div align="center">

<img src="public/logo.png" alt="Action" width="72" />

# Action

**Plan it, focus on it, finish it.**

A keyboard-first task manager with natural-language capture, a planning board,
a focus timer and honest productivity analytics.

[![CI](https://github.com/rajrishi-06/action/actions/workflows/ci.yml/badge.svg)](https://github.com/rajrishi-06/action/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-149eca)
![Vite](https://img.shields.io/badge/Vite-7-646cff)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## What it does

**Capture in one line.** Type `Draft the release notes friday 4pm #work !high ~45m`
and Action parses the date, priority, tag and estimate out of it — and shows you
exactly what it understood before you commit.

**Five views over one set of tasks.**

| View | What it is for |
|---|---|
| **Today** | What you have actually committed to right now |
| **Upcoming** | Everything scheduled beyond today |
| **Board** | Drag cards between Backlog → Planned → In progress → Done |
| **Calendar** | A month at a glance; drag a task onto a day to reschedule it |
| **Focus** | A Pomodoro timer that stays accurate in a background tab |
| **Insights** | Streaks, throughput and completion patterns from real timestamps |

**Keyboard-first.** `⌘K` opens a palette that searches your tasks *and* runs
commands. `/` jumps to search, `?` lists every shortcut, `Space` completes the
focused task, `E` renames it inline.

**AI where it helps, rules where it doesn't.** Task breakdown, tagging and time
estimates work with no AI account at all, using the built-in playbook. Deploy the
included proxy (`api/ai.js`) and the same features get model-backed suggestions
instead.

**Works offline.** Writes made without a connection are queued in IndexedDB and
replayed in order when it returns, with a visible count of what is still
waiting — never a silent failure.

---

## Quick start

```bash
git clone https://github.com/rajrishi-06/action.git
cd action
npm install
cp .env.example .env      # then fill in your Supabase details
npm run dev
```

Open <http://localhost:5173>. If `.env` is missing, the app boots into a setup
screen that walks you through the rest rather than showing a blank page.

### 1 · Create a Supabase project

Sign up at [supabase.com](https://supabase.com/dashboard) and create a project.
From **Project settings → API**, copy the **Project URL** and the **anon public**
key into `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The anon key is designed to be public. What actually protects your data is Row
Level Security, which the schema sets up.

### 2 · Run the schema

Open **SQL Editor → New query**, paste in [`supabase/tables.sql`](supabase/tables.sql)
and run it. It creates the `tasks` table, its indexes, the RLS policies and the
realtime publication. Re-running it is safe.

> **Upgrading from an earlier build?** Run
> [`supabase/migrations/001_upgrade_from_v0.sql`](supabase/migrations/001_upgrade_from_v0.sql)
> **first**. It adds and renames columns without touching your existing tasks.

### 3 · Enable the sign-in methods you want

Under **Authentication → Providers**, email/password is on by default. Magic
links need **Email → Enable email confirmations**. Add
`http://localhost:5173` and your production URL under **URL Configuration →
Redirect URLs**.

---

## Capture syntax

Everything is optional and can appear anywhere in the line.

| You type | Action understands |
|---|---|
| `tomorrow`, `tonight`, `friday`, `next monday` | A due date |
| `at 5pm`, `17:30`, `noon` | A time of day |
| `in 3 days`, `next week`, `Dec 25` | A due date |
| `!urgent` `!high` `!low`, or `p1`–`p4`, or `!!!` | Priority |
| `#work` `#health` | Tags |
| `~45m` `~2h` `~1h30m` | A time estimate |
| `every day`, `every monday`, `monthly` | A repeating task |

Words like *urgent* or *important* also nudge the priority, but stay in the
title — they carry meaning there.

---

## Configuration

| Variable | Required | What it does |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | The publishable anon key |
| `VITE_AI_PROXY_URL` | — | Server endpoint that holds your AI key and forwards prompts |
| `VITE_GEMINI_API_KEY` | — | **Local development only** — see below |
| `VITE_GEMINI_MODEL` | — | Defaults to `gemini-2.0-flash` |

### A note on AI keys

Anything in a `VITE_` variable is compiled into the JavaScript bundle and is
readable by anyone who opens devtools. `VITE_GEMINI_API_KEY` is therefore
**ignored in production builds**, and the Settings screen says so explicitly if
one is present.

To ship AI features, put the key behind an endpoint you control. A working proxy
is included at [`api/ai.js`](api/ai.js) — it verifies the caller's Supabase
session so it is not an open relay for your quota, rate-limits per user, times
out before the client does, and logs no prompts.

Deploy it with the app (Vercel and Netlify routing are already configured), then
set on the **server**, not as `VITE_` variables:

```
GEMINI_API_KEY=...        the real key
SUPABASE_URL=...          used to verify the caller
SUPABASE_ANON_KEY=...
```

and in the client build:

```
VITE_AI_PROXY_URL=https://your-app.example.com/api/ai
```

Without it, every AI-labelled feature still works — it just uses the local rules
in `src/lib/ai/heuristics.js`.

---

## Scripts

```bash
npm run dev              # dev server with hot reload
npm run build            # production build into dist/
npm run preview          # serve the production build locally
npm run lint             # eslint, including react-hooks and jsx-a11y
npm run test             # vitest
npm run test:watch       # vitest in watch mode
npm run coverage         # coverage report
npm run check            # lint + test + build, the same gate CI runs

npm run test:e2e         # Playwright, stubbed backend — needs no credentials
npm run verify:supabase  # assert a live project's schema, RLS and triggers
```

### Verifying a live database

Row Level Security is the only thing protecting your data — the publishable key
is designed to be public, which is safe *provided* the policies are right. After
running the schema, check them:

```bash
npm run verify:supabase
```

It creates two throwaway users, asserts each cannot read, update, delete or forge
the other's rows, exercises the write trigger and the column constraints, then
cleans up. Email confirmation must be off for the run, or sign-up returns no
session to test with.

To run the end-to-end suite against a real project as well:

```bash
E2E_LIVE=1 npm run test:e2e
```

---

## Architecture

```
src/
├── lib/            Pure logic — no React. This is where the tests live.
│   ├── taskParser.js     natural-language parsing
│   ├── analytics.js      streaks, throughput, heatmaps
│   ├── taskMapper.js     database row ↔ UI task
│   ├── taskReducer.js    optimistic updates and rollback
│   ├── ordering.js       fractional board index + renormalisation
│   ├── outbox.js         durable offline write queue
│   ├── progress.js       XP, levels, achievements
│   ├── export.js         JSON / CSV / Markdown
│   └── ai/               provider transport + offline heuristics
├── context/        Providers: Auth, Theme, Toast, Todo, Pomodoro
├── hooks/          useHotkeys, useFocusTrap, useAsyncResource, …
├── components/
│   ├── ui/         Button, Input, Modal, Toaster, primitives
│   ├── tasks/      composer, list, item, detail, toolbar
│   ├── board/      drag-and-drop Kanban
│   ├── charts/     validated, theme-aware visualisations
│   └── layout/     sidebar, theme toggle
└── routes/         One file per URL

api/                Serverless AI proxy
e2e/                Playwright suites — stubbed and live
scripts/            Live-database verification
supabase/           Schema and migrations
```

Two principles hold the codebase together:

1. **Logic lives in `lib/` and is pure.** Anything worth testing takes its
   inputs as arguments — including the clock — so tests need no mocks and no DOM.
2. **State transitions go through a reducer.** Optimistic updates, rollback and
   undo are data, not scattered `setState` calls, which is what makes them
   testable and consistent.

### Data model

Tasks carry `completed_at` alongside `is_completed`, so every metric answers
"when did this actually get done" rather than inferring it from creation time.
Board position uses fractional indexing, so moving one card writes one row
instead of renumbering the column — and renormalises automatically when repeated
drops into the same gap exhaust float precision.

Writes carry an `updated_at` precondition. If a task changed on another device
first, the write is rejected rather than silently overwriting it, and you are
offered the choice.

---

## Accessibility

- Every interactive element is a real control with an accessible name.
- Dialogs trap focus, close on `Escape` and restore focus on close.
- One consistent focus ring, visible in both themes.
- Charts pair colour with a legend, direct labels and a table view; the
  categorical palette is validated for colour-vision deficiency and for 3:1
  contrast against both surfaces.
- `prefers-reduced-motion` is respected globally.
- A skip link jumps past the navigation.

---

## Deployment

```bash
npm run build
```

Deploy `dist/` anywhere static. The app is a single-page application, so the
host must rewrite unknown paths to `index.html` — `vercel.json` and
`netlify.toml` in this repo already do that. Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in your host's environment variables, and add the
deployed URL to Supabase's redirect list.

---

## License

[MIT](LICENSE).

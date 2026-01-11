
# Pitch Pulse

Pitch Pulse is a React + TypeScript web app for running a repeatable pitch/credit workflow: create a run, pull/inspect data, validate inputs, generate pitchbook/credit memo content, route for approvals, and export printable documents.

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui (Radix UI)
- React Router
- TanStack Query
- Supabase (auth + database + edge functions)

## Getting started

### Prerequisites

- Node.js (LTS recommended)

### Install

```sh
npm install
```

### Environment variables

Copy `.env.example` to `.env` in the project root:

```bat
copy .env.example .env
```

Then fill in the values:

```sh
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_SUPABASE_ANON_KEY"
```

### Run

```sh
npm run dev
```

Vite is configured to run on `http://localhost:8080`.

## Supabase

- Database migrations live in `supabase/migrations`.
- The edge function used for SEC data is in `supabase/functions/fetch-sec-data`.

If you’re using Supabase locally, apply migrations using your preferred workflow (Supabase CLI / dashboard) and ensure Auth is enabled.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint

## Notes

- Don’t commit secrets. Keep `.env` out of git.



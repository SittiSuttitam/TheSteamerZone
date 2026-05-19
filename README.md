# TheSteamerZone

Tier 1 Hybrid stack: **React + Vite** (Vercel) + **Supabase** (Auth, Postgres, Realtime) + **local connector** (TikTok Live, key sender, gift/combo logic, TTS BYOK stub).

## Repos

- This repo is **standalone** (fresh `git init`). Legacy Win Controller remains a separate reference for parity.

## Quick start

```bash
npm install
npm run build:shared
npm run dev:connector   # terminal 1 — needs .env (see apps/connector/.env.example)
npm run dev:web         # terminal 2 — http://localhost:5173
```

1. Create a Supabase project, run `supabase/migrations/20250219120000_init.sql` (or `supabase db push`).
2. Create a row in `rooms` and note `id` + `widget_secret`.
3. Set `apps/connector/.env`: `SUPABASE_*`, `DEFAULT_ROOM_ID=<rooms.id uuid>`.
4. Set `apps/web/.env` from `.env.example`.

## URLs

- Dashboard: `/app/voice`, `/app/rules`, `/app/studio`, `/app/connection`
- WIN widget: `/w/<roomId>/win?token=<widget_secret>&scale=1`

## Docs

- [FEATURE_PARITY.md](./FEATURE_PARITY.md) — legacy v1.9.1 checklist
- [supabase/README.md](./supabase/README.md) — DB + Auth
- [docs/UPGRADE_TIER2.md](./docs/UPGRADE_TIER2.md) — optional cloud worker
- [MIGRATION_FROM_ELECTRON.md](./MIGRATION_FROM_ELECTRON.md)

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:web` | Vite dev server |
| `npm run dev:connector` | Local connector |
| `npm run build` | shared + web + connector |

## License

MIT

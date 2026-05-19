# TheSteamerZone

Tier 1 Hybrid stack: **React + Vite** (Vercel) + **Supabase** (Auth, Postgres, Realtime) + **local connector** (TikTok Live, key sender, gift/combo logic, TTS BYOK stub).

## Repos

- This repo is **standalone** (fresh `git init`). Legacy Win Controller remains a separate reference for parity.

## Quick start

```bash
npm run setup          # install + copy .env templates
# แก้ apps/web/.env และ apps/connector/.env (ดู SETUP_TH.md)
npm run setup:check
npm run build:shared
npm run dev:connector   # terminal 1
npm run dev:web         # terminal 2 — http://localhost:5173
```

**คู่มือภาษาไทย:** [SETUP_TH.md](./SETUP_TH.md)

1. Supabase: รัน migrations ทั้งสองไฟล์ใน `supabase/migrations/`
2. เปิด Google Auth + redirect `http://localhost:5173`
3. ล็อกอิน → **สตูดิโอ** → โหลดห้อง → ใส่ `DEFAULT_ROOM_ID` ใน connector `.env`

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

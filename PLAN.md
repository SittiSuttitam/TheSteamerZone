# TheSteamerZone — implementation plan (summary)

The authoritative product plan lives in your Cursor plan file (`revamp_like_ttsam_4bee820f.plan.*`). This repo implements:

- **Tier 1 Hybrid:** Vercel (web) + Supabase + local connector.
- **Design:** Apple-like dashboard (Voice, Rules, Studio, Connection).
- **Parity:** See [FEATURE_PARITY.md](./FEATURE_PARITY.md).

## Implemented in this repo

- Monorepo (`apps/web`, `apps/connector`, `packages/shared`).
- Supabase SQL migration for `rooms`, `live_state`, `actions`, settings tables.
- Connector: health, state API, gift-config file, TikTok connect, gift/combo → WIN, wheel broadcast, activity broadcast, Realtime publish + `live_state` upsert, TTS stub.
- Web: dashboard shell, Supabase Google auth hook, connector health/TikTok, widget routes including WIN + Activity feed, Realtime `useRoomBroadcast`.
- Docs: README, migration, Tier 2 upgrade, Vercel SPA rewrite.

## Still to reach full parity

- All placeholder widgets, VIP, likes, top coin persistence, sounds, hotkeys, tray `.exe`, migration script automation — track in [FEATURE_PARITY.md](./FEATURE_PARITY.md).

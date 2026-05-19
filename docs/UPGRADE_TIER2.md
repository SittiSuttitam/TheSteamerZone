# Optional Tier 2 — cloud TikTok worker

Tier 1 runs **tiktok-live-connector** inside the desktop **connector** so you pay $0 for always-on processes.

Move to Tier 2 when:

- You do not want to run anything locally during a stream, or
- You need 24/7 processing without your PC online.

## Approach

1. Deploy a small Node service (Railway, Fly.io, Render, or Oracle Cloud free tier).
2. Move `WebcastPushConnection` + gift/combo dispatcher to that service.
3. Keep publishing to **Supabase Realtime** (same channel names) so Vercel widgets stay unchanged.
4. Secure the worker with a shared secret or Supabase service role only from worker env.

## Cost ballpark

- Railway / Fly: ~$5/mo for a tiny always-on dyno (varies).
- Oracle Free Tier ARM: $0 with manual ops.

## Security

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- Rotate `widget_secret` if a URL leaks.

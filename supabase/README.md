# Supabase setup (TheSteamerZone)

1. Create project at [supabase.com](https://supabase.com).
2. Run migrations:

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

Or paste `supabase/migrations/20250219120000_init.sql` in SQL Editor.

3. **Auth → Providers:** enable Google (Client ID / Secret from Google Cloud Console).
4. **Authentication → URL config:** add your Vercel URL and `http://localhost:5173`.
5. **Realtime:** ensure `live_state` is in publication (migration adds it).

## Env (apps/web `.env`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CONNECTOR_URL=http://127.0.0.1:8780
```

## Env (apps/connector `.env`)

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CONNECTOR_PORT=8780
ROOM_ID=optional-default-room-uuid-after-created
```

Create a room row in Table Editor or via dashboard after login; use that `id` as `roomId` in widget URLs.

## Realtime

Widgets subscribe to channel `room:<roomId>` for **broadcast** events from the connector (see `apps/connector/src/realtime.ts`).

Also subscribe to postgres changes on `live_state` for the row matching `room_id` as a fallback.

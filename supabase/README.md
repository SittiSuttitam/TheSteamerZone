# Supabase setup (TheSteamerZone)

1. Create project at [supabase.com](https://supabase.com).
2. Run migrations:

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

Or paste both files in SQL Editor (in order):

- `supabase/migrations/20250219120000_init.sql`
- `supabase/migrations/20250519120000_bootstrap_user_room.sql` (auto room on signup)

3. **Auth → Providers:** enable Google (Client ID / Secret from Google Cloud Console).
4. **Authentication → URL config** (สำคัญ — ถ้าผิดจะ redirect ไป localhost):
   - **Site URL:** `https://thesteamerzone.vercel.app`
   - **Redirect URLs:**  
     `https://thesteamerzone.vercel.app/**`  
     `http://localhost:5173/**`
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
DEFAULT_ROOM_ID=<rooms.id uuid from Studio page or Table Editor>
```

After Google login, open **สตูดิโอ OBS** → **โหลดห้องจากบัญชี** (or signup trigger creates one automatically).

## Realtime

Widgets subscribe to channel `room:<roomId>` for **broadcast** events from the connector (see `apps/connector/src/realtime.ts`).

Also subscribe to postgres changes on `live_state` for the row matching `room_id` as a fallback.

# Supabase setup (TheSteamerZone)

## Cursor MCP (แนะนำ)

ตั้งค่าแล้วใน `.cursor/mcp.json` — เปิด Cursor → **Settings → Tools & MCP** → ล็อกอิน Supabase (OAuth) → รีสตาร์ท Cursor

- โปรเจกต์: `kipszrqegcdebzdrupkd`
- ใช้รัน migration / ดูตาราง / SQL จากแชทได้ (เช่น “list tables with MCP”)

เอกสาร: [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)

---

1. Create project at [supabase.com](https://supabase.com).
2. Run migrations:

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

Or paste both files in SQL Editor (in order):

- `supabase/migrations/20250219120000_init.sql`
- `supabase/migrations/20250519120000_bootstrap_user_room.sql` (auto room on signup)
- `supabase/migrations/20250519130000_user_overlay_images.sql` (รูป overlay ต่อ user + Storage bucket `overlay-images`)
- `supabase/migrations/20250519140000_room_gift_config.sql` (กฎของขวัญต่อห้อง — RLS เฉพาะเจ้าของ)

3. **Auth → Providers:** enable Google (Client ID / Secret from Google Cloud Console).
4. **Authentication → URL Configuration** (ถ้าไม่แก้ หลัง login จะไป `localhost:5173` เสมอ):
   - **Site URL:** `https://thesteamerzone.vercel.app` (ห้ามใช้ localhost เป็น Site URL บน production)
   - **Redirect URLs** (เพิ่มครบทุกบรรทัด):
     - `https://thesteamerzone.vercel.app/**`
     - `https://thesteamerzone.vercel.app/auth/callback`
     - `https://thesteamerzone.vercel.app/app/connection`
     - `http://localhost:5173/**` (เฉพาะ dev — OAuth จะเด้งไป production อัตโนมัติ)
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

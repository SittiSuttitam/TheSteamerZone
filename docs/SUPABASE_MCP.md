# Supabase MCP (Cursor / Claude)

โปรเจกต์: `kipszrqegcdebzdrupkd`  
URL: `https://kipszrqegcdebzdrupkd.supabase.co`

## Cursor (ใช้ใน IDE นี้)

ไฟล์ `.cursor/mcp.json` ตั้งค่าแล้ว

1. **รีสตาร์ท Cursor** (หรือ Reload Window)
2. ไป **Settings → Cursor Settings → Tools & MCP**
3. เลือกเซิร์ฟเวอร์ **supabase** → **Authenticate** (ล็อกอิน Supabase ในเบราว์เซอร์)
4. ตรวจว่าเครื่องมือ MCP ขึ้นสีเขียว / Connected

## Claude Code (เทอร์มินัล)

```bash
claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=kipszrqegcdebzdrupkd"
claude /mcp
```

เลือก supabase → Authenticate

## Agent Skills (ทางเลือก)

```bash
npx skills add supabase/agent-skills
```

## หมายเหตุกับ Connector

MCP ช่วย AI จัดการ Supabase ได้ — **ไม่แทน** คีย์ใน `apps/connector/.env`

โปรแกรม Connector ยังต้องมี (ตอน build):

- `SUPABASE_URL` (มีแล้ว)
- `SUPABASE_SERVICE_ROLE_KEY` — จาก Supabase Dashboard → Settings → API → `service_role` (secret)

แล้วรัน `npm run build:connector:desktop` ใหม่

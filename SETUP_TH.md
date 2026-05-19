# ตั้งค่า TheSteamerZone (ภาษาไทย)

คู่มือนี้สำหรับตั้งค่าครั้งแรกบนเครื่องคุณ + deploy ขึ้น Vercel

## 0. เตรียมเครื่อง

- Node.js 20+
- Git (repo: [TheSteamerZone](https://github.com/SittiSuttitam/TheSteamerZone))

```bash
cd TheSteamerZone
npm run setup
```

คำสั่งนี้จะ `npm install` และสร้าง `apps/web/.env` + `apps/connector/.env` จากตัวอย่าง

---

## 1. Supabase

1. ไปที่ [supabase.com](https://supabase.com) → **New project**
2. **SQL Editor** → วางและรันตามลำดับ:
   - `supabase/migrations/20250219120000_init.sql`
   - `supabase/migrations/20250519120000_bootstrap_user_room.sql`
3. **Project Settings → API** คัดลอก:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` `public` → `VITE_SUPABASE_ANON_KEY`
   - `service_role` `secret` → `SUPABASE_SERVICE_ROLE_KEY` (เฉพาะ connector — **ห้าม**ใส่ในเว็บ)

### Google Login

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth client (Web)
   - Authorized redirect: คัดลอกจาก Supabase **Authentication → Providers → Google**
2. Supabase **Authentication → Providers → Google** เปิดใช้ ใส่ Client ID / Secret
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173` (ตอนพัฒนา)
   - Redirect URLs:
     - `http://localhost:5173/**`
     - `https://YOUR-APP.vercel.app/**` (หลัง deploy)

---

## 2. ไฟล์ `.env`

### `apps/web/.env`

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_CONNECTOR_URL=http://127.0.0.1:8780
```

### `apps/connector/.env`

```env
CONNECTOR_PORT=8780
CONNECTOR_PUBLIC_URL=http://127.0.0.1:8780
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DEFAULT_ROOM_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`DEFAULT_ROOM_ID` = คอลัมน์ `id` ในตาราง `rooms` (ได้หลังล็อกอิน — ดูข้อ 3)

---

## 3. สร้างห้อง (Room)

**วิธีง่าย:** ล็อกอินด้วย Google → เมนู **สตูดิโอ OBS** → กด **โหลดห้องจากบัญชี** หรือ **สร้างห้องใหม่**

ระบบจะเติม **รหัสห้อง** และ **widget secret** ให้อัตโนมัติ (บันทึกในเบราว์เซอร์)

คัดลอก **รหัสห้อง** ไปใส่ `DEFAULT_ROOM_ID` ใน `apps/connector/.env` แล้วรีสตาร์ท connector

---

## 4. รันบนเครื่อง

เทอร์มินัล 1:

```bash
npm run build:shared
npm run dev:connector
```

### แพ็กเป็นโปรแกรมหน้าต่าง (แนะนำ)

```bash
npm run build:connector:desktop
```

เปิดไฟล์:

`release/desktop/TheSteamerZone-Connector-0.1.0-portable.exe`

- มีหน้าต่างโปรแกรม (สถานะ, เชื่อม TikTok, เปิดแดชบอร์ด)
- ปิดหน้าต่าง = ย่อลงถาดระบบ (ยังทำงานอยู่)
- แก้ `.env` ในโฟลเดอร์ที่แตกจาก portable หรือกด「ไฟล์ .env」ในแอป

### แบบโฟลเดอร์ + .bat (ทางเลือก)

```bash
npm run build:connector:win
```

→ `release/TheSteamerZone-Connector/TheSteamerZone Connector.bat`

เทอร์มินัล 2:

```bash
npm run dev:web
```

เปิดเบราว์เซอร์: **http://localhost:5173** → เข้าสู่ระบบ → **เชื่อมต่อ**

ตรวจสถานะ:

```bash
npm run setup:check
```

### OBS

เมนู **สตูดิโอ OBS** → คัดลอก URL วิดเจ็ต (เช่น Win, Wheel, TTS) ไปใส่ Browser Source ใน OBS

ตัวอย่าง:

`http://localhost:5173/w/<room-id>/win?token=<widget_secret>`

---

## 5. Deploy เว็บ (Vercel)

1. [vercel.com](https://vercel.com) → Import repo `TheSteamerZone`
2. **Root Directory:** ปล่อยเป็นที่ root ของ repo (มี `vercel.json` ชี้ build ไป `apps/web`)
3. Environment Variables (Production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CONNECTOR_URL` = URL ที่ผู้ชมเข้าถึง connector ได้ (ดูด้านล่าง)

4. Deploy แล้วเพิ่ม URL ใน Supabase Redirect URLs

> **Connector ยังรันบนเครื่องสตรีมเมอร์** (TikTok + คีย์บอร์ด) — ไม่ใส่ `service_role` บน Vercel

ถ้าต้องการให้แดชบอร์ดบนมือถือเรียก connector ที่บ้าน ใช้ tunnel (ngrok / Cloudflare Tunnel) แล้วตั้ง `VITE_CONNECTOR_URL` เป็น URL นั้น

---

## 6. เสียง TTS

- ใช้เสียงที่ติดตั้งใน Windows (Web Speech) — ฟรี
- หน้า **เสียง & TTS** → พิมพ์ข้อความทดสอบ → กดเล่น
- ถ้าไม่มีเสียงภาษาใด: Settings → Time & Language → Speech → Add voices

---

## สรุปปัญหาที่พบบ่อย

| อาการ | แก้ |
|--------|-----|
| หน้า Login บอกให้ใส่ `.env` | แก้ `apps/web/.env` แล้วรีสตาร์ท `npm run dev:web` |
| Connector `supabase: false` | ใส่ `SUPABASE_URL` + `SERVICE_ROLE` ใน connector `.env` |
| วิดเจ็ตไม่อัปเดต | ตรวจ `DEFAULT_ROOM_ID` ตรงกับ room ในสตูดิโอ |
| Google login วนกลับ error | ตรวจ Redirect URL ใน Supabase ตรงกับ domain จริง |
| OBS เปิด localhost ไม่ได้ | ใช้ URL จากเครื่องเดียวกัน หรือ deploy แล้วใช้ลิงก์ Vercel |

---

## เอกสารเพิ่ม

- [supabase/README.md](./supabase/README.md)
- [LOCAL_QA.md](./LOCAL_QA.md)
- [FEATURE_PARITY.md](./FEATURE_PARITY.md)

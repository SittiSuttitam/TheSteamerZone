# Local QA checklist — TheSteamerZone

## ก่อนเริ่ม

```powershell
cd "d:\download\electron-win-controller-updated-label (2)\TheSteamerZone"
npm install
```

### Terminal 1 — Connector

```powershell
cd apps\connector
npm run dev
# หรือ: npm run build ; npm start
```

### Terminal 2 — Web

```powershell
cd TheSteamerZone
npm run dev:web
# เปิด http://localhost:5173
```

### (ถ้าใช้ Realtime / Login)

- คัดลอก `apps/web/.env.example` → `apps/web/.env` ใส่ Supabase URL + anon key  
- คัดลอก `apps/connector/.env.example` → `apps/connector/.env` ใส่ `SUPABASE_*`, `DEFAULT_ROOM_ID`  
- (TTS สมจริง) ใส่ API key ที่หน้า **เสียง & TTS** หรือ `GOOGLE_TTS_API_KEY` ใน connector `.env`

---

## Automated tests (รันทุกครั้งก่อน release)

```powershell
cd TheSteamerZone
npm test
```

ครอบคลุม: build shared/connector/web, unit (shared + gifts), integration (health, WIN, TTS, wheel, mock gift)

---

## Manual checklist (เช็คในเบราว์เซอร์)

| # | ขั้นตอน | ผ่าน |
|---|---------|------|
| 1 | `/login` → เข้า Google (หรือเห็นข้อความตั้งค่า Supabase) | ☐ |
| 2 | หน้า **เชื่อมต่อ** → health แสดง `ok: true` | ☐ |
| 3 | กด **+1 / −1 / รีเซ็ต WIN** → ตัวเลขใน API/state เปลี่ยน | ☐ |
| 4 | เปิด `/w/{roomId}/win?token=…` → ตัวเลข sync (ต้องมี Supabase) | ☐ |
| 5 | หน้า **เสียง & TTS** → เลือกโทน → ทดสอบเสียง | ☐ |
| 6 | เปิด OBS Browser Source `/w/{roomId}/tts?token=…` → กดส่งไป OBS | ☐ |
| 7 | เปิด `/w/{roomId}/wheel?token=…` → กด **หมุนวงล้อทดสอบ** | ☐ |
| 8 | หน้า **สตูดิโอ OBS** → คัดลอก URL วิดเจ็ต | ☐ |
| 9 | หน้า **ตัวอย่างดีไซน์** → เห็นรูป legacy 4 แบบ | ☐ |
| 10 | TikTok connect (ถ้ามีห้อง live จริง) | ☐ |

---

## Legacy Electron (โปรเจกต์เดิม)

```powershell
cd "d:\download\electron-win-controller-updated-label (2)"
npm test
```

# TheSteamerZone — Feature parity vs Win Controller Electron v1.9.1

**สัญลักษณ์:** ✅ ทำแล้ว (ทดสอบอัตโนมัติ/สโมกผ่าน) · ⚠️ บางส่วน · ❌ ยังไม่ทำ · 🔧 ต้องตั้งค่า (Supabase / API key)

**รันเทส local:** จากโฟลเดอร์ `TheSteamerZone` → `npm test`  
**เช็คมือ:** ดู [LOCAL_QA.md](./LOCAL_QA.md)

---

## Core WIN counter

| # | Legacy feature | TheSteamerZone | Status |
|---|----------------|----------------|--------|
| 1 | WIN increment/decrement/reset | หน้าเชื่อมต่อ + Connector API | ✅ |
| 2 | WIN label text | `PATCH /api/state` (UI ตั้งค่ายังจำกัด) | ⚠️ |
| 3 | Goal display on overlay | `/w/:roomId/win` | ✅ |
| 4 | WIN min/max limits | Connector `clampWin` (UI ตั้งค่ายังจำกัด) | ⚠️ |
| 5 | Hotkeys Ctrl+Up / Ctrl+Down / Ctrl+R | — | ❌ |
| 6 | Real-time overlay sync | Supabase Realtime + `live_state` | ✅ 🔧 |
| 7 | WIN persistence after restart | Postgres `live_state` เมื่อมี Supabase | ✅ 🔧 |

## Sounds

| # | Legacy feature | Status |
|---|----------------|--------|
| 8 | Win/lose sounds on count change | ✅ (`sound_play` + legacy MP3 ใน Win widget) |
| 9 | Upload custom WIN/LOSE files | ❌ |
| 10 | Volume + test play | ⚠️ (ตัวอย่าง MP3 ในหน้าเสียง; ปรับ volume TTS ได้) |

## Gift mapping (TikTok)

| # | Legacy feature | Status |
|---|----------------|--------|
| 11 | Connect/disconnect TikTok Live room | ✅ |
| 12 | Map gift → WIN delta | ✅ |
| 13 | Map gift → key combo (`node-key-sender`) | ✅ |
| 14 | Multiplier × repeat count | ✅ |
| 15 | Gift combo finalize (timeout + repeatEnd) | ✅ |
| 16 | Mock gift for testing | ✅ |
| 17 | Enable/disable gift mapping globally | ✅ |

## Ribbon roller (wheel)

| # | Legacy feature | Status |
|---|----------------|--------|
| 18 | Trigger wheel by gift id | ✅ |
| 19 | Weighted random outcomes | ✅ (สุ่มฝั่ง server → `selectedItem`) |
| 20 | Spin/result duration, scale | ✅ |
| 21 | Spin/result sounds | ⚠️ (ใช้ increment/decrement แทน wheel MP3 ชั่วคราว) |
| 22 | Outcome applies WIN / key | ✅ (`POST /api/wheel/result`) |

## Overlays (OBS Browser Source)

| Legacy file | Route | Status |
|-------------|-------|--------|
| `overlay.html` | `/w/:roomId/win` | ✅ |
| `overlay-wheel.html` | `/w/:roomId/wheel` | ✅ |
| `overlay-image.html` | `/w/:roomId/image` | ❌ placeholder |
| `overlay-likes.html` | `/w/:roomId/likes` | ❌ placeholder |
| `overlay-topcoin.html` | `/w/:roomId/topcoin` | ❌ placeholder |
| `overlay-topviewers.html` | `/w/:roomId/topviewers` | ❌ placeholder |
| `overlay-topdonate.html` | `/w/:roomId/topdonate` | ❌ placeholder |
| _(ใหม่)_ TTS | `/w/:roomId/tts` | ✅ |
| _(ใหม่)_ Activity / Chat | `/w/:roomId/activity`, `/chat` | ✅ |

| # | Behavior | Status |
|---|----------|--------|
| 23 | Query `room`, `scale`, `theme` | ⚠️ (`scale` บน win/wheel; `theme` วงล้อยังไม่ครบ) |
| 24 | Colors/fonts/negative copy | ⚠️ |
| 25 | Image overlay assets | ❌ |

## TTS (ฟีเจอร์ใหม่ — ไม่มีใน Electron เดิม)

| # | Feature | Status |
|---|---------|--------|
| T1 | โทนเสียงหลายแบบ (Thai Neural2 + อื่นๆ) | ✅ |
| T2 | Google Cloud TTS (API key ในหน้าเสียง หรือ `.env`) | ✅ 🔧 |
| T3 | Web Speech fallback | ✅ |
| T4 | OBS widget `/w/:id/tts` | ✅ |
| T5 | อ่านแชท / ของขวัญอัตโนมัติ | ✅ |
| T6 | บันทึก settings ที่ Connector | ✅ |

## Viewer alerts (VIP)

| # | Feature | Status |
|---|---------|--------|
| 26–30 | Track VIP, sounds, upload/mock, volume, active list | ❌ |

## Top donors / top likers / likes

| # | Feature | Status |
|---|---------|--------|
| 31–35 | Top coin + manual donor tools | ❌ |
| 36–37 | Top gifters live session | ❌ |
| 38–42 | Like counter, goal, celebration, sounds, reset | ❌ |

## Local connector

| # | Feature | Status |
|---|---------|--------|
| 43 | Background/tray (optional MVP: console) | ⚠️ (รัน console เท่านั้น) |
| 44 | `GET /health` | ✅ |
| 45 | Sound paths (`%APPDATA%/TheSteamerZone` or migrated) | ⚠️ (legacy samples ใน `public/`; upload ยังไม่มี) |

## Auth & dashboard

| # | Feature | Status |
|---|---------|--------|
| A1 | Login Google ก่อนเข้าแดชบอร์ด | ✅ 🔧 |
| A2 | UI ภาษาไทย | ✅ |
| A3 | สร้างห้อง / ผูก room กับ user ใน UI | ❌ (ตั้งใน Supabase เอง) |

## Definition of done

- [x] Automated tests: `npm test` ใน `TheSteamerZone`
- [ ] All parity rows ✅ (ยังมี placeholder overlays + VIP + likes)
- [ ] Live TikTok test ≥ 30 minutes without missed events
- [ ] All widget URLs verified in OBS
- [ ] Migration from `%APPDATA%/win-controller-electron/*.json` documented or automated

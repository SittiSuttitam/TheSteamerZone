# Migrating from Win Controller (Electron)

Legacy app stores JSON under `%APPDATA%/win-controller-electron/`.

| Legacy file | TheSteamerZone |
|-------------|----------------|
| `gift-config.json` | Connector reads `TheSteamerZone/gift-config.json` — copy or symlink, or use **Rules** UI (planned) |
| `win-sound-config.json` | Connector sounds directory (planned parity) |
| Room names (string) | Supabase `rooms.id` **UUID** — create a room and set `DEFAULT_ROOM_ID` |

## Steps

1. Install and run the new **connector** once to create `%APPDATA%/TheSteamerZone/`.
2. Copy `gift-config.json` into that folder (adjust paths if needed).
3. Create Supabase `rooms` + `live_state` rows; set `DEFAULT_ROOM_ID` on the connector.
4. Open the web dashboard → **Connection** → sign in with Google → connect TikTok.
5. Use **Studio** to copy HTTPS widget URLs for OBS.

A scripted importer (`tools/migrate-legacy-config`) can be added to automate JSON → Supabase.

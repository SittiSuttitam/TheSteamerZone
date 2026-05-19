import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

/** โฟลเดอร์ที่วาง .env (portable build ตั้ง TSZ_INSTALL_DIR ใน .bat) */
export function getInstallDir(): string {
  const fromEnv = process.env.TSZ_INSTALL_DIR?.trim();
  if (fromEnv) return fromEnv.replace(/[/\\]+$/, '');
  return process.cwd();
}

const envFile = path.join(getInstallDir(), '.env');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

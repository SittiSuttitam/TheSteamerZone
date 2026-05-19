/**
 * จุดเริ่มสำหรับ portable / แพ็กเกจ Windows — โหลด .env จากโฟลเดอร์เดียวกับโปรแกรม
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
process.env.TSZ_INSTALL_DIR = here;

await import('./dist/index.js');

/** ค่าเริ่มต้นแดชบอร์ด — อ่านจาก .env ที่ฝังใน portable build */
const PRODUCTION_WEB_SITE = 'https://thesteamerzone.vercel.app';

function readWebPublicUrlFromEnvFile(envPath, fs) {
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, 'utf8');
  const m = text.match(/^WEB_PUBLIC_URL\s*=\s*(\S+)/m);
  if (!m?.[1]) return null;
  const v = m[1].trim();
  if (!v || v.includes('localhost') || v.includes('127.0.0.1:5173')) {
    return null;
  }
  return v.replace(/\/$/, '');
}

/**
 * @param {{ connectorRoot: string, fs: typeof import('fs') }} opts
 */
function resolveDashboardUrl(opts) {
  const { connectorRoot, fs } = opts;
  const fromFile = readWebPublicUrlFromEnvFile(
    require('path').join(connectorRoot, '.env'),
    fs
  );
  if (fromFile) return fromFile;
  const fromProcess = (process.env.WEB_PUBLIC_URL || '').trim();
  if (
    fromProcess &&
    !fromProcess.includes('localhost') &&
    !fromProcess.includes('127.0.0.1:5173')
  ) {
    return fromProcess.replace(/\/$/, '');
  }
  return PRODUCTION_WEB_SITE;
}

module.exports = { PRODUCTION_WEB_SITE, resolveDashboardUrl };

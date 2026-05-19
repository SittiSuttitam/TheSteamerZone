import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const IMAGE_SLOTS = ['positive', 'negative', 'heart', 'hammer'] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];

export type ImageOverlayConfig = Record<ImageSlot, string | null>;

const DEFAULT_CONFIG: ImageOverlayConfig = {
  positive: null,
  negative: null,
  heart: null,
  hammer: null,
};

export const DEFAULT_LEGACY_FILES: Record<ImageSlot, string> = {
  positive: 'positive.png',
  negative: 'negative.png',
  heart: 'heart.png',
  hammer: 'hammer.png',
};

export function imagesDir(dataDir: string): string {
  const dir = path.join(dataDir, 'images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function configPath(dataDir: string): string {
  return path.join(dataDir, 'image-overlay-config.json');
}

export function loadImageOverlayConfig(dataDir: string): ImageOverlayConfig {
  const p = configPath(dataDir);
  try {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<ImageOverlayConfig>;
      return { ...DEFAULT_CONFIG, ...raw };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG };
}

export function saveImageOverlayConfig(dataDir: string, cfg: ImageOverlayConfig) {
  fs.writeFileSync(configPath(dataDir), JSON.stringify(cfg, null, 2), 'utf8');
}

export function uploadImage(
  dataDir: string,
  cfg: ImageOverlayConfig,
  type: ImageSlot,
  filename: string,
  buffer: Buffer
): ImageOverlayConfig {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(safeName) || '.png';
  const stored = `${type}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
  const dest = path.join(imagesDir(dataDir), stored);
  fs.writeFileSync(dest, buffer);

  const old = cfg[type];
  if (old && old !== stored) {
    try {
      fs.unlinkSync(path.join(imagesDir(dataDir), old));
    } catch {
      /* ignore */
    }
  }

  const next = { ...cfg, [type]: stored };
  saveImageOverlayConfig(dataDir, next);
  return next;
}

export function clearImageSlot(
  dataDir: string,
  cfg: ImageOverlayConfig,
  type: ImageSlot
): ImageOverlayConfig {
  const old = cfg[type];
  if (old) {
    try {
      fs.unlinkSync(path.join(imagesDir(dataDir), old));
    } catch {
      /* ignore */
    }
  }
  const next = { ...cfg, [type]: null };
  saveImageOverlayConfig(dataDir, next);
  return next;
}

export type ImageSlotPublic = {
  type: ImageSlot;
  filename: string | null;
  /** URL สำหรับแสดงใน OBS / พรีวิว */
  url: string;
  isCustom: boolean;
  legacyFile: string;
};

export function publicImageConfig(
  cfg: ImageOverlayConfig,
  connectorPublicUrl: string,
  webLegacyBase: string
): Record<ImageSlot, ImageSlotPublic> {
  const out = {} as Record<ImageSlot, ImageSlotPublic>;
  for (const type of IMAGE_SLOTS) {
    const filename = cfg[type];
    const legacyFile = DEFAULT_LEGACY_FILES[type];
    const isCustom = !!filename;
    const url = isCustom
      ? `${connectorPublicUrl.replace(/\/$/, '')}/images/${filename}`
      : `${webLegacyBase.replace(/\/$/, '')}/legacy-samples/${legacyFile}`;
    out[type] = { type, filename, url, isCustom, legacyFile };
  }
  return out;
}

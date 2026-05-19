/** รายการวิดเจ็ต OBS */
export type WidgetCategoryId = 'core' | 'chat' | 'leaderboard' | 'effects';

export type WidgetCatalogItem = {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  category: WidgetCategoryId;
  obsHowTo: string;
  obsSize: string;
  /** ขนาดแนะนำสำหรับตั้ง Browser Source ใน OBS */
  obsWidth?: number;
  obsHeight?: number;
  previewW: number;
  previewH: number;
  ready: boolean;
};

export const WIDGET_CATEGORIES: {
  id: WidgetCategoryId;
  label: string;
  emoji: string;
}[] = [
  { id: 'core', label: 'หลัก — WIN / วงล้อ', emoji: '🎯' },
  { id: 'chat', label: 'แชท & กิจกรรม', emoji: '💬' },
  { id: 'leaderboard', label: 'อันดับ & สถิติ', emoji: '🏆' },
  { id: 'effects', label: 'เอฟเฟ็กต์ & อื่นๆ', emoji: '✨' },
];

export const WIDGET_CATALOG: WidgetCatalogItem[] = [
  {
    slug: 'win',
    label: 'ตัวนับ WIN',
    emoji: '🏆',
    category: 'core',
    description: 'ตัวเลขชนะ/แพ้ กลางจอ — อัปเดตจากของขวัญหรือปุ่มทดสอบ',
    obsHowTo: 'วางกลางจอ · ปรับขนาดตัวเลขใน OBS',
    obsSize: 'กว้างยืดหยุ่น · สูง ~200px',
    obsWidth: 400,
    obsHeight: 200,
    previewW: 360,
    previewH: 160,
    ready: true,
  },
  {
    slug: 'wheel',
    label: 'วงล้อของขวัญ',
    emoji: '🎡',
    category: 'core',
    description: 'หมุนเมื่อได้ของขวัญตามกฎที่ตั้งไว้',
    obsHowTo: 'Browser Source กว้างเต็มแถบ',
    obsSize: '800 × 200',
    obsWidth: 800,
    obsHeight: 200,
    previewW: 640,
    previewH: 180,
    ready: true,
  },
  {
    slug: 'sound',
    label: 'เสียง (WIN / VIP)',
    emoji: '🔔',
    category: 'effects',
    description: 'เล่นเสียง +/− และเสียง VIP — วาง Browser Source ขนาด 1×1 px',
    obsHowTo: 'Sources → Browser → วางมุมใดก็ได้ (ซ่อนได้)',
    obsSize: '1 × 1 (มองไม่เห็น)',
    obsWidth: 1,
    obsHeight: 1,
    previewW: 120,
    previewH: 48,
    ready: true,
  },
  {
    slug: 'tts',
    label: 'อ่านออกเสียง (TTS)',
    emoji: '🔊',
    category: 'core',
    description: 'อ่านข้อความจาก Realtime — วาง Browser ขนาด 1×1 px',
    obsHowTo: 'Browser Source 1×1 · ทดสอบจากหน้า Widgets',
    obsSize: '1 × 1',
    obsWidth: 1,
    obsHeight: 1,
    previewW: 280,
    previewH: 72,
    ready: true,
  },
  {
    slug: 'chat',
    label: 'แชทสด',
    emoji: '💬',
    category: 'chat',
    description: 'ข้อความจาก TikTok Live แบบเรียลไทม์',
    obsHowTo: 'มุมล่างของจอ',
    obsSize: '400 × 600',
    obsWidth: 400,
    obsHeight: 600,
    previewW: 320,
    previewH: 200,
    ready: true,
  },
  {
    slug: 'activity',
    label: 'ฟีดกิจกรรม',
    emoji: '✨',
    category: 'chat',
    description: 'ของขวัญและเหตุการณ์ล่าสุด',
    obsHowTo: 'ข้างแชทหรือมุมจอ',
    obsSize: '420 × 280',
    obsWidth: 420,
    obsHeight: 280,
    previewW: 360,
    previewH: 220,
    ready: true,
  },
  {
    slug: 'topdonate',
    label: 'อันดับของขวัญ',
    emoji: '🎁',
    category: 'leaderboard',
    description: 'Top ผู้ส่งของขวัญ — อัปเดตเมื่อมี gift',
    obsHowTo: 'มุมข้างจอ · ทดสอบด้วยปุ่ม Mock gift',
    obsSize: '300 × 520',
    obsWidth: 300,
    obsHeight: 520,
    previewW: 280,
    previewH: 180,
    ready: true,
  },
  {
    slug: 'topcoin',
    label: 'อันดับเหรียญ',
    emoji: '🪙',
    category: 'leaderboard',
    description: 'Top เหรียญ/ของขวัญ (คะแนนรวม)',
    obsHowTo: 'มุมข้างจอ',
    obsSize: '300 × 520',
    obsWidth: 300,
    obsHeight: 520,
    previewW: 280,
    previewH: 180,
    ready: true,
  },
  {
    slug: 'likes',
    label: 'ยอดไลค์',
    emoji: '❤️',
    category: 'leaderboard',
    description: 'ยอดไลค์ + แถบเป้าหมาย',
    obsHowTo: 'มุมจอ · ทดสอบปุ่ม Mock like',
    obsSize: '300 × 520',
    obsWidth: 300,
    obsHeight: 520,
    previewW: 280,
    previewH: 180,
    ready: true,
  },
  {
    slug: 'topviewers',
    label: 'ผู้ชมสูงสุด',
    emoji: '👀',
    category: 'leaderboard',
    description: 'อันดับผู้ไลค์ / ผู้ชม active',
    obsHowTo: 'มุมจอ',
    obsSize: '300 × 520',
    previewW: 280,
    previewH: 180,
    ready: true,
  },
  {
    slug: 'image',
    label: 'รูป / เอฟเฟ็กต์',
    emoji: '🖼️',
    category: 'effects',
    description: 'รูปบวก/ลบตาม WIN + หัวใจ/ค้อนเมื่อคะแนนเปลี่ยน — ตั้งรูปที่เมนู «รูปภาพ»',
    obsHowTo: 'เต็มจอ · ตั้งค่ารูปที่แท็บ รูปภาพ',
    obsSize: '1920 × 1080',
    obsWidth: 1920,
    obsHeight: 1080,
    previewW: 360,
    previewH: 240,
    ready: true,
  },
];

export function widgetsInCategory(cat: WidgetCategoryId) {
  return WIDGET_CATALOG.filter((w) => w.category === cat);
}

export function readyWidgetCount() {
  return WIDGET_CATALOG.filter((w) => w.ready).length;
}

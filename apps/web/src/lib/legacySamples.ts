/** รูป/เสียงตัวอย่างจากโปรเจกต์ Electron เดิม (`static/`) — เก็บใน `public/legacy-samples/` */
export function legacySamplePath(filename: string): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}legacy-samples/${filename}`;
}

import { connectorUrl } from './connector';
import { legacySamplePath } from './legacySamples';

export type SoundPayload = {
  name?: string;
  file?: string;
  url?: string;
  volume?: number;
};

/** เล่นเสียงใน Browser Source (WIN / Sound widget) */
export function playWidgetSound(payload: SoundPayload) {
  const vol = Math.min(1, Math.max(0, Number(payload.volume ?? 0.7)));
  let src = payload.url;
  const file = payload.file || '';
  if (!src && file) {
    if (file === 'increment.mp3' || file === 'decrement.mp3') {
      src = legacySamplePath(file);
    } else {
      src = `${connectorUrl()}/sounds/${encodeURIComponent(file)}`;
    }
  }
  if (!src) {
    if (payload.name === 'decrement') src = legacySamplePath('decrement.mp3');
    else if (payload.name === 'increment') src = legacySamplePath('increment.mp3');
  }
  if (!src) return;
  try {
    const a = new Audio(src);
    a.volume = vol;
    void a.play();
  } catch {
    /* ignore */
  }
}

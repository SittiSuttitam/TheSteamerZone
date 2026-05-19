import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { connectorUrl, api } from '../lib/connector';
import { legacySamplePath } from '../lib/legacySamples';
import { useRoomBroadcast } from '../hooks/useRoomBroadcast';
import { useRoomChannel } from '../hooks/useRoomChannel';

type ImageSlot = 'positive' | 'negative' | 'heart' | 'hammer';
type SlotMap = Record<ImageSlot, string>;

const LEGACY: SlotMap = {
  positive: legacySamplePath('positive.png'),
  negative: legacySamplePath('negative.png'),
  heart: legacySamplePath('heart.png'),
  hammer: legacySamplePath('hammer.png'),
};

export function ImageWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const { state } = useRoomBroadcast(roomId, token);
  const [urls, setUrls] = useState<SlotMap>(LEGACY);
  const prevWin = useRef(0);
  const [mainSrc, setMainSrc] = useState(LEGACY.positive);
  const [burst, setBurst] = useState<'heart' | 'hammer' | null>(null);

  useEffect(() => {
    const webBase = window.location.origin;
    api<{ slots: Record<ImageSlot, { url: string }> }>(
      `${connectorUrl()}/api/image-overlay/config?webBase=${encodeURIComponent(webBase)}`
    )
      .then((d) => {
        const next = { ...LEGACY };
        for (const k of Object.keys(LEGACY) as ImageSlot[]) {
          if (d.slots[k]?.url) next[k] = d.slots[k].url;
        }
        setUrls(next);
      })
      .catch(() => setUrls(LEGACY));
  }, []);

  useEffect(() => {
    const win = state?.win ?? 0;
    setMainSrc(win >= 0 ? urls.positive : urls.negative);
    const delta = win - prevWin.current;
    if (delta > 0) {
      setBurst('heart');
      window.setTimeout(() => setBurst(null), 1200);
    } else if (delta < 0) {
      setBurst('hammer');
      window.setTimeout(() => setBurst(null), 900);
    }
    prevWin.current = win;
  }, [state?.win, urls]);

  useRoomChannel(roomId, token, {
    sound_play: (p) => {
      const name = String(p.name ?? '');
      if (name === 'increment') {
        setBurst('heart');
        window.setTimeout(() => setBurst(null), 1200);
      } else if (name === 'decrement') {
        setBurst('hammer');
        window.setTimeout(() => setBurst(null), 900);
      }
    },
  });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent">
      <img
        src={mainSrc}
        alt=""
        className="max-h-[80%] max-w-[80%] object-contain transition-opacity duration-300"
      />
      {burst === 'heart' && (
        <img
          src={urls.heart}
          alt=""
          className="pointer-events-none absolute animate-bounce"
          style={{ width: 48, height: 48, top: '40%', left: '55%' }}
        />
      )}
      {burst === 'hammer' && (
        <img
          src={urls.hammer}
          alt=""
          className="pointer-events-none absolute"
          style={{ width: 96, height: 96, top: '35%', left: '45%' }}
        />
      )}
    </div>
  );
}

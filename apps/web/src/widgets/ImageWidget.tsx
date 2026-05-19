import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import {
  IMAGE_SLOTS,
  type ImageSlot,
  demoUrl,
  fetchRoomOwnerOverlaySlots,
  slotsToUrlMap,
} from '../lib/imageOverlayCloud';
import { useRoomBroadcast } from '../hooks/useRoomBroadcast';
import { useRoomChannel } from '../hooks/useRoomChannel';

type SlotMap = Record<ImageSlot, string>;

function defaultUrls(): SlotMap {
  const urls = {} as SlotMap;
  for (const slot of IMAGE_SLOTS) {
    urls[slot] = demoUrl(slot);
  }
  return urls;
}

export function ImageWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const { state } = useRoomBroadcast(roomId, token);
  const [urls, setUrls] = useState<SlotMap>(defaultUrls);
  const prevWin = useRef(0);
  const [mainSrc, setMainSrc] = useState(() => demoUrl('positive'));
  const [burst, setBurst] = useState<'heart' | 'hammer' | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !roomId) {
      setUrls(defaultUrls());
      return;
    }
    void fetchRoomOwnerOverlaySlots(sb, roomId)
      .then((slots) => setUrls(slotsToUrlMap(slots)))
      .catch(() => setUrls(defaultUrls()));
  }, [roomId]);

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

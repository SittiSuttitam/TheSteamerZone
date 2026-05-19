import { useParams, useSearchParams } from 'react-router-dom';
import { playWidgetSound } from '../lib/playWidgetSound';
import { useRoomChannel } from '../hooks/useRoomChannel';

/** Browser Source สำหรับเสียง WIN / VIP — วาง 1×1 px ก็ได้ */
export function SoundWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');

  useRoomChannel(roomId, token, {
    sound_play: (p) => playWidgetSound(p),
    vip_alert: (p) =>
      playWidgetSound({
        file: String(p.soundFile || 'increment.mp3'),
        volume: Number(p.volume) || 0.7,
        name: 'vip',
      }),
  });

  return <div className="min-h-[1px] min-w-[1px] bg-transparent" aria-hidden />;
}

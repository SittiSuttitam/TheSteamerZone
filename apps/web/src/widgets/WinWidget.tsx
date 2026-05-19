import { useSearchParams, useParams } from 'react-router-dom';
import { useRoomBroadcast } from '../hooks/useRoomBroadcast';
import { useRoomChannel } from '../hooks/useRoomChannel';
import { playWidgetSound } from '../lib/playWidgetSound';

export function WinWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const scale = parseFloat(search.get('scale') || '1') || 1;
  const { state } = useRoomBroadcast(roomId, token);

  useRoomChannel(roomId, token, {
    sound_play: (p) => playWidgetSound(p),
  });

  const win = state?.win ?? 0;
  const label = state?.winLabel ?? 'WIN';

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-transparent p-4"
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      <div className="text-center" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <div
          className="text-7xl font-semibold tabular-nums tracking-tight text-white drop-shadow-md"
          style={{ textShadow: '0 2px 24px rgba(0,0,0,0.4)' }}
        >
          {win}
        </div>
        <div className="mt-2 text-lg font-medium uppercase tracking-[0.2em] text-white/90">
          {label}
        </div>
        {state?.winGoal != null && (
          <div className="mt-4 text-sm text-white/70">Goal {state.winGoal}</div>
        )}
      </div>
    </div>
  );
}

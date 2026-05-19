import { useParams, useSearchParams } from 'react-router-dom';
import { useRoomLiveState } from '../hooks/useRoomLiveState';

export function LikesWidget() {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const live = useRoomLiveState(roomId, token);
  const goal = live.likeGoal ?? 1000;
  const pct = goal > 0 ? Math.min(100, Math.round((live.totalLikes / goal) * 100)) : 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
      <div className="w-full max-w-[320px] rounded-2xl border border-white/15 bg-black/55 p-6 text-center text-white shadow-xl backdrop-blur-md">
        <p className="text-4xl">❤️</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">{live.totalLikes.toLocaleString()}</p>
        <p className="mt-1 text-sm text-white/70">ยอดไลค์</p>
        {live.likeGoal != null && (
          <>
            <div className="mx-auto mt-4 h-3 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-red-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              เป้าหมาย {goal.toLocaleString()} ({pct}%)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

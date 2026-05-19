import { useParams, useSearchParams } from 'react-router-dom';
import { useRoomLiveState } from '../hooks/useRoomLiveState';
import type { LeaderboardEntry } from '@thesteamerzone/shared';

type Props = {
  title: string;
  emoji: string;
  pick: (live: ReturnType<typeof useRoomLiveState>) => LeaderboardEntry[];
  emptyHint: string;
};

export function LeaderboardWidget({ title, emoji, pick, emptyHint }: Props) {
  const { roomId } = useParams<{ roomId: string }>();
  const [search] = useSearchParams();
  const token = search.get('token');
  const live = useRoomLiveState(roomId, token);
  const rows = pick(live);

  return (
    <div className="flex min-h-screen items-start justify-center bg-transparent p-4">
      <div className="w-full max-w-[300px] rounded-2xl border border-white/15 bg-black/55 p-4 font-sans text-white shadow-xl backdrop-blur-md">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <span>{emoji}</span>
          {title}
        </h2>
        {rows.length === 0 ? (
          <p className="text-sm text-white/60">{emptyHint}</p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, i) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm"
              >
                <span className="truncate">
                  <span className="mr-2 font-bold text-amber-300">#{i + 1}</span>
                  {row.nickname}
                </span>
                <span className="shrink-0 font-mono text-amber-200">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

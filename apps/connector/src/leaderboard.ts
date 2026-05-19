import type { LeaderboardEntry } from '@thesteamerzone/shared';

const MAX = 10;

function parseEntries(raw: unknown): LeaderboardEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      const userId = String(o.userId ?? o.user_id ?? o.username ?? '').trim();
      const nickname = String(o.nickname ?? o.name ?? userId).trim();
      const score = Number(o.score ?? o.coins ?? 0);
      if (!userId) return null;
      return { userId, nickname, score: Number.isFinite(score) ? score : 0 };
    })
    .filter((x): x is LeaderboardEntry => !!x);
}

export function bumpLeaderboard(
  list: LeaderboardEntry[],
  userId: string,
  nickname: string,
  addScore: number
): LeaderboardEntry[] {
  const id = userId.trim() || 'unknown';
  const name = nickname.trim() || id;
  const add = Number.isFinite(addScore) ? Math.max(0, addScore) : 0;
  const map = new Map<string, LeaderboardEntry>();
  for (const row of list) {
    map.set(row.userId, { ...row });
  }
  const cur = map.get(id);
  map.set(id, {
    userId: id,
    nickname: name,
    score: (cur?.score ?? 0) + add,
  });
  return [...map.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX);
}

export function parseTopDonors(raw: unknown): LeaderboardEntry[] {
  return parseEntries(raw);
}

export function parseTopLikers(raw: unknown): LeaderboardEntry[] {
  return parseEntries(raw);
}

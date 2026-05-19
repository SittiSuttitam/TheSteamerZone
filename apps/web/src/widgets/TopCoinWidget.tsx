import { LeaderboardWidget } from './LeaderboardWidget';

/** เหรียญ — ใช้คะแนนจากของขวัญ (เดียวกับ top donate) */
export function TopCoinWidget() {
  return (
    <LeaderboardWidget
      title="อันดับเหรียญ"
      emoji="🪙"
      pick={(live) => live.topDonors}
      emptyHint="ยังไม่มีข้อมูล — ทดสอบที่หน้า Widgets"
    />
  );
}

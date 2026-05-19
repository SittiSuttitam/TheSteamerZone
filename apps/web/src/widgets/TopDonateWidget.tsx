import { LeaderboardWidget } from './LeaderboardWidget';

export function TopDonateWidget() {
  return (
    <LeaderboardWidget
      title="อันดับของขวัญ"
      emoji="🎁"
      pick={(live) => live.topDonors}
      emptyHint="ยังไม่มีข้อมูล — ทดสอบที่หน้า Widgets หรือรับของขวัญจริง"
    />
  );
}

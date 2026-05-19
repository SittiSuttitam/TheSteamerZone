import { LeaderboardWidget } from './LeaderboardWidget';

export function TopViewersWidget() {
  return (
    <LeaderboardWidget
      title="ผู้ชมสูงสุด"
      emoji="👀"
      pick={(live) => live.topLikers}
      emptyHint="ยังไม่มีข้อมูล — ทดสอบไลค์ที่หน้า Widgets"
    />
  );
}

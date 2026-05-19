import { Navigate } from 'react-router-dom';

/** เดิมชื่อ ลิงก์ OBS — รวมอยู่ที่หน้า Widgets แล้ว */
export function StudioPage() {
  return <Navigate to="/app/widgets" replace />;
}

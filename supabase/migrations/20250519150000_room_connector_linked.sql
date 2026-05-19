-- สถานะ Connector บนเครื่อง (อัปเดตจากโปรแกรม — เว็บอ่านได้โดยไม่เรียก localhost)

alter table public.rooms
  add column if not exists connector_linked_at timestamptz;

comment on column public.rooms.connector_linked_at is
  'Heartbeat จาก TheSteamerZone Connector เมื่อเชื่อมห้องแล้ว';

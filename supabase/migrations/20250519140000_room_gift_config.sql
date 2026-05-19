-- กฎของขวัญ + วงล้อ ต่อห้อง (เจ้าของ room เท่านั้นที่แก้ได้)

create table if not exists public.room_gift_config (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.room_gift_config enable row level security;

create policy "room_gift_config_owner"
  on public.room_gift_config
  for all
  using (
    exists (
      select 1
      from public.rooms r
      where r.id = room_gift_config.room_id
        and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.rooms r
      where r.id = room_gift_config.room_id
        and r.owner_id = auth.uid()
    )
  );

drop trigger if exists room_gift_config_updated on public.room_gift_config;
create trigger room_gift_config_updated
  before update on public.room_gift_config
  for each row execute function public.set_updated_at();

comment on table public.room_gift_config is 'Gift rules + wheel JSON per room; isolated by room owner via RLS';

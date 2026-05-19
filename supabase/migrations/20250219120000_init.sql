-- TheSteamerZone initial schema (Tier 1 Hybrid)
-- Enable extensions
create extension if not exists "uuid-ossp";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rooms (streamer workspace)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete set null,
  name text not null default 'Room',
  tiktok_username text,
  widget_secret text not null default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists rooms_widget_secret_idx on public.rooms (widget_secret);

-- JSON config blobs
create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null default 'Action',
  enabled boolean default true,
  trigger jsonb not null default '{}',
  effects jsonb not null default '[]',
  priority int default 0,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists actions_room_idx on public.actions (room_id);

create table if not exists public.tts_settings (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  engine_order text[] default array['web_speech','google_cloud'],
  voices jsonb default '{}',
  rate numeric default 1,
  pitch numeric default 0,
  volume numeric default 1,
  google_credentials_encrypted text,
  updated_at timestamptz default now()
);

create table if not exists public.widget_settings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  widget_key text not null,
  settings jsonb not null default '{}',
  unique (room_id, widget_key)
);

-- Live state (persisted + Realtime)
create table if not exists public.live_state (
  room_id uuid primary key references public.rooms (id) on delete cascade,
  win int not null default 0,
  win_label text not null default 'WIN',
  win_goal int,
  win_min int,
  win_max int,
  top_donors jsonb default '[]',
  top_likers jsonb default '[]',
  total_likes bigint default 0,
  like_goal int,
  meta jsonb default '{}',
  updated_at timestamptz default now()
);

alter publication supabase_realtime add table public.live_state;

-- RLS
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.actions enable row level security;
alter table public.tts_settings enable row level security;
alter table public.widget_settings enable row level security;
alter table public.live_state enable row level security;

-- Profiles: user can read/update own row
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Rooms: owner full access; anon read of room by id for widgets (token verified in app layer)
create policy "rooms_owner_all" on public.rooms
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "rooms_public_read" on public.rooms
  for select using (true);

-- Actions, tts, widget: owner only
create policy "actions_owner" on public.actions
  for all using (
    exists (select 1 from public.rooms r where r.id = actions.room_id and r.owner_id = auth.uid())
  );

create policy "tts_owner" on public.tts_settings
  for all using (
    exists (select 1 from public.rooms r where r.id = tts_settings.room_id and r.owner_id = auth.uid())
  );

create policy "widget_settings_owner" on public.widget_settings
  for all using (
    exists (select 1 from public.rooms r where r.id = widget_settings.room_id and r.owner_id = auth.uid())
  );

-- live_state: owner update; public read for realtime subscribers (widgets use filtered channel)
create policy "live_state_owner_write" on public.live_state
  for all using (
    exists (select 1 from public.rooms r where r.id = live_state.room_id and r.owner_id = auth.uid())
  );

create policy "live_state_public_read" on public.live_state
  for select using (true);

-- Trigger: bump updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_updated on public.rooms;
create trigger rooms_updated before update on public.rooms
  for each row execute function public.set_updated_at();

drop trigger if exists live_state_updated on public.live_state;
create trigger live_state_updated before update on public.live_state
  for each row execute function public.set_updated_at();

comment on table public.rooms is 'TheSteamerZone stream rooms';
comment on table public.live_state is 'Current WIN and overlay-related counters; Supabase Realtime enabled';

-- Auto-create profile + default room when a user signs up (Google OAuth, etc.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room_id uuid;
  display text;
begin
  display := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'Streamer'
  );

  insert into public.profiles (id, display_name)
  values (new.id, display)
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.rooms (owner_id, name)
  values (new.id, 'ห้องของฉัน')
  returning id into new_room_id;

  insert into public.live_state (room_id)
  values (new_room_id)
  on conflict (room_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

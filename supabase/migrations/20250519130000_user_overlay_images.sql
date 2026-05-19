-- รูป overlay ต่อผู้ใช้ (แยกตาม auth.users.id) + Storage bucket

create table if not exists public.user_overlay_images (
  user_id uuid primary key references auth.users (id) on delete cascade,
  positive_path text,
  negative_path text,
  heart_path text,
  hammer_path text,
  updated_at timestamptz default now()
);

alter table public.user_overlay_images enable row level security;

create policy "user_overlay_images_own"
  on public.user_overlay_images
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- วิดเจ็ต OBS อ่าน path ของเจ้าของห้องได้ (ไม่มี secret ใน path — ใช้ร่วมกับ room id สาธารณะ)
create policy "user_overlay_images_public_read"
  on public.user_overlay_images
  for select
  using (true);

drop trigger if exists user_overlay_images_updated on public.user_overlay_images;
create trigger user_overlay_images_updated
  before update on public.user_overlay_images
  for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'overlay-images',
  'overlay-images',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "overlay_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'overlay-images');

create policy "overlay_images_owner_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'overlay-images'
    and auth.uid()::text = (storage.foldername (name))[1]
  );

create policy "overlay_images_owner_update"
  on storage.objects
  for update
  using (
    bucket_id = 'overlay-images'
    and auth.uid()::text = (storage.foldername (name))[1]
  )
  with check (
    bucket_id = 'overlay-images'
    and auth.uid()::text = (storage.foldername (name))[1]
  );

create policy "overlay_images_owner_delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'overlay-images'
    and auth.uid()::text = (storage.foldername (name))[1]
  );

comment on table public.user_overlay_images is 'Custom image overlay paths per user; demo when path is null';

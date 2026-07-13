-- M1: profiles, spare_relationships, invite_codes + RLS + redeem_invite_code RPC

-- ============================================================
-- profiles
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any authenticated user"
on public.profiles for select
to authenticated
using (true);

create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- tự tạo profile khi có user mới đăng ký
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- spare_relationships (owner_id sở hữu spare_id, một chiều)
-- ============================================================
create table public.spare_relationships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  spare_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, spare_id),
  check (owner_id <> spare_id)
);

create index spare_relationships_owner_idx on public.spare_relationships (owner_id);
create index spare_relationships_spare_idx on public.spare_relationships (spare_id);

alter table public.spare_relationships enable row level security;

create policy "owner or spare can view the relationship"
on public.spare_relationships for select
to authenticated
using (auth.uid() = owner_id or auth.uid() = spare_id);

-- cả owner lẫn spare đều tự xoá được (quyết định CONTEXT.md §10.4)
create policy "owner or spare can delete the relationship"
on public.spare_relationships for delete
to authenticated
using (auth.uid() = owner_id or auth.uid() = spare_id);

-- không cho insert trực tiếp từ client — chỉ tạo qua redeem_invite_code

-- ============================================================
-- invite_codes
-- ============================================================
create table public.invite_codes (
  code text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  used_at timestamptz,
  used_by uuid references public.profiles(id)
);

create index invite_codes_owner_idx on public.invite_codes (owner_id);

alter table public.invite_codes enable row level security;

create policy "owner can view their own invite codes"
on public.invite_codes for select
to authenticated
using (auth.uid() = owner_id);

create policy "owner can create their own invite codes"
on public.invite_codes for insert
to authenticated
with check (auth.uid() = owner_id);

-- redeem đi qua RPC security definer, không có update/delete policy cho client

-- ============================================================
-- redeem_invite_code(p_code) — dùng 1 lần, hết hạn 24h, tạo spare_relationships
-- ============================================================
create function public.redeem_invite_code(p_code text)
returns table (owner_id uuid, owner_display_name text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite public.invite_codes;
begin
  select * into v_invite
  from public.invite_codes
  where code = p_code
  for update;

  if v_invite.code is null then
    raise exception 'invite_not_found';
  end if;

  if v_invite.used_at is not null then
    raise exception 'invite_already_used';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'invite_expired';
  end if;

  if v_invite.owner_id = auth.uid() then
    raise exception 'cannot_redeem_own_code';
  end if;

  insert into public.spare_relationships (owner_id, spare_id)
  values (v_invite.owner_id, auth.uid())
  on conflict (owner_id, spare_id) do nothing;

  update public.invite_codes
  set used_at = now(), used_by = auth.uid()
  where code = p_code;

  return query
    select p.id, p.display_name
    from public.profiles p
    where p.id = v_invite.owner_id;
end;
$$;

grant execute on function public.redeem_invite_code(text) to authenticated;

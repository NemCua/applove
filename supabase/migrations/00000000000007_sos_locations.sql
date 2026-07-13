-- M4: vị trí realtime của owner trong lúc phiên cầu cứu đang 'accepted'.
--
-- 1 row / session, UPSERT đè lên vị trí cũ (không lưu lịch sử đường đi — MVP chỉ
-- cần vị trí hiện tại, xem CONTEXT.md §4.3). Chỉ owner của phiên mới ghi được, và
-- chỉ spare đang giúp (accepted_by) mới đọc được — không phải ai trong sos_responses
-- cũng xem được, vì vị trí chỉ nên lộ cho đúng người đang trên đường tới giúp.

create table public.sos_locations (
  session_id uuid primary key references public.sos_sessions(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.sos_locations enable row level security;

-- owner của phiên xem được vị trí của chính mình (để tự confirm đang gửi đúng);
-- spare chỉ xem được nếu đúng là người đã được accepted_by cho phiên đó.
create policy "owner or the accepted spare can view location"
on public.sos_locations for select
to authenticated
using (
  exists (
    select 1 from public.sos_sessions s
    where s.id = sos_locations.session_id
      and (s.owner_id = auth.uid() or s.accepted_by = auth.uid())
  )
);

-- ghi vị trí đi qua RPC security definer, không insert/update trực tiếp từ client

-- ============================================================
-- update_sos_location(p_session_id, p_lat, p_lng) — chỉ owner của phiên đang
-- 'accepted' mới gọi được (chưa ai nhận thì chưa cần gửi vị trí, đỡ hao pin/data).
-- ============================================================
create function public.update_sos_location(p_session_id uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sos_sessions;
begin
  select * into v_session from public.sos_sessions where id = p_session_id;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;

  if v_session.owner_id is distinct from auth.uid() then
    raise exception 'not_allowed';
  end if;

  if v_session.status is distinct from 'accepted' then
    raise exception 'session_not_accepted';
  end if;

  insert into public.sos_locations (session_id, latitude, longitude, updated_at)
  values (p_session_id, p_lat, p_lng, now())
  on conflict (session_id)
  do update set latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
end;
$$;

grant execute on function public.update_sos_location(uuid, double precision, double precision) to authenticated;

alter publication supabase_realtime add table public.sos_locations;

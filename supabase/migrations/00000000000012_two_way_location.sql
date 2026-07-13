-- Nâng cấp sos_locations lên 2 chiều: owner gửi vị trí cho spare xem (đã có từ
-- M4), và giờ thêm chiều ngược lại — spare đang giúp cũng gửi vị trí của mình
-- để owner xem được người đang tới đâu rồi.
--
-- Đổi khoá chính từ session_id (1 row/session) sang (session_id, profile_id)
-- — vẫn 1 row/người/session (UPSERT đè, không lưu lịch sử đường đi).

alter table public.sos_locations drop constraint sos_locations_pkey;
alter table public.sos_locations add column profile_id uuid references public.profiles(id) on delete cascade;

-- Dữ liệu cũ (nếu còn) là vị trí owner — gán lại profile_id = owner_id của
-- session đó để không mất dữ liệu đang có. Phải backfill xong TRƯỚC khi set
-- not null/primary key, nếu không Postgres báo lỗi cột chứa NULL.
update public.sos_locations sl
set profile_id = s.owner_id
from public.sos_sessions s
where s.id = sl.session_id and sl.profile_id is null;

alter table public.sos_locations alter column profile_id set not null;
alter table public.sos_locations add primary key (session_id, profile_id);

drop policy "owner or the accepted spare can view location" on public.sos_locations;

-- Owner xem được vị trí của mình VÀ của spare đang giúp; spare đang giúp xem
-- được vị trí của owner VÀ của chính mình. Tức là chỉ 2 người trong 1 phiên
-- 'accepted' nhìn thấy nhau, không ai khác.
create policy "owner and accepted spare can view each other's location"
on public.sos_locations for select
to authenticated
using (
  exists (
    select 1 from public.sos_sessions s
    where s.id = sos_locations.session_id
      and (s.owner_id = auth.uid() or s.accepted_by = auth.uid())
      and (sos_locations.profile_id = s.owner_id or sos_locations.profile_id = s.accepted_by)
  )
);

-- ============================================================
-- update_sos_location — giờ nhận diện người gọi qua auth.uid(), cho phép cả
-- owner lẫn accepted_by của phiên gọi (trước đây chỉ owner).
-- ============================================================
create or replace function public.update_sos_location(p_session_id uuid, p_lat double precision, p_lng double precision)
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

  if v_session.status is distinct from 'accepted' then
    raise exception 'session_not_accepted';
  end if;

  if auth.uid() is distinct from v_session.owner_id and auth.uid() is distinct from v_session.accepted_by then
    raise exception 'not_allowed';
  end if;

  insert into public.sos_locations (session_id, profile_id, latitude, longitude, updated_at)
  values (p_session_id, auth.uid(), p_lat, p_lng, now())
  on conflict (session_id, profile_id)
  do update set latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
end;
$$;

grant execute on function public.update_sos_location(uuid, double precision, double precision) to authenticated;

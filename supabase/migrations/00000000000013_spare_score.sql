-- Điểm số cho từng quan hệ owner→spare ("lốp nào chất lượng nhất" theo góc nhìn
-- của owner) — điểm chỉ tồn tại trong 1 quan hệ cụ thể, không phải điểm public
-- của cả tài khoản. +100 khi owner xác nhận spare đã hoàn thành giúp đỡ, -50
-- khi owner đánh giá chưa hoàn thành (điểm sàn 0, không âm). Từ chối/không phản
-- hồi không ảnh hưởng điểm vì họ không tham gia.

alter table public.spare_relationships add column score integer not null default 0;

-- Đổi 'ended' (mơ hồ) thành 2 trạng thái rõ nghĩa: 'completed' (owner xác nhận
-- spare đã giúp xong) và 'failed' (owner đánh giá chưa hoàn thành, HOẶC spare tự
-- huỷ giữa chừng — 2 trường hợp này phân biệt bằng ended_by, không cần thêm cột).
--
-- Phải update dữ liệu cũ TRƯỚC khi add constraint mới — nếu add constraint
-- trước, các row đang có status='ended' sẽ vi phạm constraint ngay lập tức
-- (đã gặp lỗi này lúc chạy migration thật, phải sửa lại thứ tự).
alter table public.sos_sessions drop constraint sos_sessions_status_check;
update public.sos_sessions set status = 'failed' where status = 'ended';
alter table public.sos_sessions add constraint sos_sessions_status_check
  check (status = any (array['active', 'accepted', 'completed', 'failed']));

-- ============================================================
-- complete_sos_session — owner xác nhận spare đã giúp xong: +100đ cho quan hệ
-- owner→spare đó, đóng phiên với status 'completed'.
-- ============================================================
create function public.complete_sos_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sos_sessions;
begin
  select * into v_session from public.sos_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;

  if v_session.status is distinct from 'accepted' then
    raise exception 'session_not_accepted';
  end if;

  if auth.uid() is distinct from v_session.owner_id then
    raise exception 'not_allowed';
  end if;

  update public.sos_sessions
  set status = 'completed', ended_at = now(), ended_by = auth.uid()
  where id = p_session_id;

  update public.spare_relationships
  set score = score + 100
  where owner_id = v_session.owner_id and spare_id = v_session.accepted_by;
end;
$$;

grant execute on function public.complete_sos_session(uuid) to authenticated;

-- ============================================================
-- fail_sos_session — owner đánh giá spare chưa hoàn thành: -50đ (sàn 0), đóng
-- phiên với status 'failed'.
-- ============================================================
create function public.fail_sos_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sos_sessions;
begin
  select * into v_session from public.sos_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;

  if v_session.status is distinct from 'accepted' then
    raise exception 'session_not_accepted';
  end if;

  if auth.uid() is distinct from v_session.owner_id then
    raise exception 'not_allowed';
  end if;

  update public.sos_sessions
  set status = 'failed', ended_at = now(), ended_by = auth.uid()
  where id = p_session_id;

  update public.spare_relationships
  set score = greatest(0, score - 50)
  where owner_id = v_session.owner_id and spare_id = v_session.accepted_by;
end;
$$;

grant execute on function public.fail_sos_session(uuid) to authenticated;

-- ============================================================
-- end_sos_session — giữ lại cho case spare tự huỷ giữa chừng (không phải owner
-- đánh giá), hoặc owner huỷ khi CHƯA có ai accepted (status vẫn 'active').
-- Không đụng điểm số vì đây không phải đánh giá của owner về chất lượng giúp đỡ.
-- Đổi status đích từ 'ended' sang 'failed' cho khớp constraint mới.
-- ============================================================
create or replace function public.end_sos_session(p_session_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_session public.sos_sessions;
begin
  select * into v_session from public.sos_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;

  if v_session.status in ('completed', 'failed') then
    return;
  end if;

  if auth.uid() is distinct from v_session.owner_id and auth.uid() is distinct from v_session.accepted_by then
    raise exception 'not_allowed';
  end if;

  update public.sos_sessions
  set status = 'failed', ended_at = now(), ended_by = auth.uid()
  where id = p_session_id;
end;
$$;

grant execute on function public.end_sos_session(uuid) to authenticated;

-- Chuyển từ Expo Push (native app) sang Web Push (Next.js) — xem CONTEXT.md
-- cho lý do đổi hướng (Expo Go từ SDK 53 không hỗ trợ remote push; build native
-- ký thật cần Apple Developer Program $99/năm; Web Push đủ tin cậy và miễn phí
-- cho quy mô nhóm bạn bè nhỏ này).
--
-- Thay đổi:
-- 1. push_tokens: đổi từ 1 cột expo_push_token sang 3 cột theo chuẩn Web Push
--    subscription (endpoint, p256dh, auth) — không còn liên quan gì Expo nữa.
-- 2. Bỏ hẳn send_push_notification/pg_net trong create_sos_session và
--    respond_to_sos — việc gửi Web Push giờ nằm ở Next.js API route
--    (app/api/webhooks/sos/route.ts), được Supabase Database Webhook gọi tới
--    mỗi khi có INSERT vào sos_responses (cấu hình qua Dashboard, không qua
--    migration vì Database Webhook là resource riêng ngoài SQL schema).

drop function if exists public.send_push_notification(uuid, text, text, jsonb);

alter table public.push_tokens
  drop column expo_push_token,
  add column endpoint text,
  add column p256dh text,
  add column auth text;

update public.push_tokens set endpoint = '', p256dh = '', auth = '' where endpoint is null;

alter table public.push_tokens
  alter column endpoint set not null,
  alter column p256dh set not null,
  alter column auth set not null;

-- ============================================================
-- create_sos_session — bỏ phần gọi send_push_notification, giữ nguyên logic tạo
-- phiên (giống hệt migration 00000000000006, trước khi 00000000000008 gắn thêm
-- push vào).
-- ============================================================
create or replace function public.create_sos_session(p_mode text, p_target_spare_id uuid default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if p_mode not in ('broadcast', 'direct') then
    raise exception 'invalid_mode';
  end if;

  if p_mode = 'direct' then
    if p_target_spare_id is null then
      raise exception 'target_spare_required';
    end if;

    if not exists (
      select 1 from public.spare_relationships
      where owner_id = auth.uid() and spare_id = p_target_spare_id
    ) then
      raise exception 'not_your_spare';
    end if;

    insert into public.sos_sessions (owner_id, mode, target_spare_id)
    values (auth.uid(), p_mode, p_target_spare_id)
    returning id into v_session_id;

    insert into public.sos_responses (session_id, spare_id)
    values (v_session_id, p_target_spare_id);
  else
    if not exists (
      select 1 from public.spare_relationships where owner_id = auth.uid()
    ) then
      raise exception 'no_spares';
    end if;

    insert into public.sos_sessions (owner_id, mode)
    values (auth.uid(), p_mode)
    returning id into v_session_id;

    insert into public.sos_responses (session_id, spare_id)
    select v_session_id, spare_id
    from public.spare_relationships
    where owner_id = auth.uid();
  end if;

  return v_session_id;
end;
$$;

grant execute on function public.create_sos_session(text, uuid) to authenticated;

-- ============================================================
-- respond_to_sos — bỏ phần gọi send_push_notification, giữ nguyên logic (giống
-- migration 00000000000006).
-- ============================================================
create or replace function public.respond_to_sos(p_session_id uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_response public.sos_responses;
  v_session public.sos_sessions;
begin
  select * into v_session from public.sos_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'session_not_found';
  end if;

  if v_session.status = 'ended' then
    raise exception 'session_ended';
  end if;

  select * into v_response
  from public.sos_responses
  where session_id = p_session_id and spare_id = auth.uid();

  if v_response.id is null then
    raise exception 'not_invited';
  end if;

  if v_response.status <> 'pending' then
    raise exception 'already_responded';
  end if;

  if p_accept then
    if v_session.status <> 'active' then
      raise exception 'already_taken_by_someone_else';
    end if;

    update public.sos_responses
    set status = 'accepted', responded_at = now()
    where id = v_response.id;

    update public.sos_sessions
    set status = 'accepted', accepted_by = auth.uid()
    where id = p_session_id;
  else
    update public.sos_responses
    set status = 'declined', responded_at = now()
    where id = v_response.id;

    if v_session.mode = 'direct' then
      update public.sos_sessions
      set status = 'ended', ended_at = now(), ended_by = auth.uid()
      where id = p_session_id;
    end if;
  end if;
end;
$$;

grant execute on function public.respond_to_sos(uuid, boolean) to authenticated;

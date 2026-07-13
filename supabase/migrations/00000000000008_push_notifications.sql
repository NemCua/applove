-- M5: push notification thật qua Expo Push API, gọi bằng pg_net ngay trong các
-- RPC đã có (create_sos_session, respond_to_sos) — không cần Edge Function riêng.
--
-- Lưu ý: Expo Push API endpoint (https://exp.host/--/api/v2/push/send) không yêu cầu
-- secret key cho push cơ bản (không bật Enhanced Security), nên không có credential
-- nào cần giấu trong SQL này.

create extension if not exists pg_net with schema extensions;

-- ============================================================
-- push_tokens — 1 row / user (MVP: 1 thiết bị/user, upsert theo profile_id khi
-- đăng nhập lại hoặc token đổi).
-- ============================================================
create table public.push_tokens (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  expo_push_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "user can view their own push token"
on public.push_tokens for select
to authenticated
using (auth.uid() = profile_id);

create policy "user can upsert their own push token"
on public.push_tokens for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "user can update their own push token"
on public.push_tokens for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "user can delete their own push token"
on public.push_tokens for delete
to authenticated
using (auth.uid() = profile_id);

-- ============================================================
-- send_push_notification(p_profile_id, p_title, p_body, p_data) — gọi Expo Push
-- API bất đồng bộ qua pg_net (không chặn transaction gọi nó). Bỏ qua im lặng nếu
-- user chưa có push token (chưa cấp quyền, hoặc chưa từng đăng nhập trên thiết bị
-- có notification).
-- ============================================================
create function public.send_push_notification(
  p_profile_id uuid,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_token text;
begin
  select expo_push_token into v_token from public.push_tokens where profile_id = p_profile_id;

  if v_token is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
    body := jsonb_build_object(
      'to', v_token,
      'title', p_title,
      'body', p_body,
      'data', p_data,
      'sound', 'default',
      'priority', 'high'
    )
  );
end;
$$;

-- ============================================================
-- Gắn thông báo vào create_sos_session: báo cho (các) spare được nhờ.
-- ============================================================
create or replace function public.create_sos_session(p_mode text, p_target_spare_id uuid default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_session_id uuid;
  v_owner_name text;
  v_spare_id uuid;
begin
  if p_mode not in ('broadcast', 'direct') then
    raise exception 'invalid_mode';
  end if;

  select display_name into v_owner_name from public.profiles where id = auth.uid();

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

    perform public.send_push_notification(
      p_target_spare_id,
      '🆘 ' || coalesce(v_owner_name, 'Ai đó') || ' đang cần giúp!',
      'Nhờ riêng bạn giúp lần này. Bấm để xem chi tiết.',
      jsonb_build_object('type', 'sos_incoming', 'sessionId', v_session_id)
    );
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

    for v_spare_id in
      select spare_id from public.spare_relationships where owner_id = auth.uid()
    loop
      perform public.send_push_notification(
        v_spare_id,
        '🆘 ' || coalesce(v_owner_name, 'Ai đó') || ' đang cần giúp!',
        'Đã nhờ tất cả lốp — ai đồng ý trước sẽ đi giúp. Bấm để xem chi tiết.',
        jsonb_build_object('type', 'sos_incoming', 'sessionId', v_session_id)
      );
    end loop;
  end if;

  return v_session_id;
end;
$$;

grant execute on function public.create_sos_session(text, uuid) to authenticated;

-- ============================================================
-- Gắn thông báo vào respond_to_sos: báo cho owner biết ai đồng ý/từ chối.
-- ============================================================
create or replace function public.respond_to_sos(p_session_id uuid, p_accept boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_response public.sos_responses;
  v_session public.sos_sessions;
  v_spare_name text;
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

  select display_name into v_spare_name from public.profiles where id = auth.uid();

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

    perform public.send_push_notification(
      v_session.owner_id,
      '🟢 ' || coalesce(v_spare_name, 'Ai đó') || ' đã đồng ý giúp!',
      'Vị trí của bạn đang được chia sẻ. Bấm để xem chi tiết.',
      jsonb_build_object('type', 'sos_owner', 'sessionId', p_session_id)
    );
  else
    update public.sos_responses
    set status = 'declined', responded_at = now()
    where id = v_response.id;

    perform public.send_push_notification(
      v_session.owner_id,
      coalesce(v_spare_name, 'Ai đó') || ' đã từ chối',
      case
        when v_session.mode = 'direct' then 'Phiên cầu cứu đã kết thúc — hãy tạo yêu cầu mới nếu cần.'
        else 'Vẫn còn người khác chưa trả lời.'
      end,
      jsonb_build_object('type', 'sos_owner', 'sessionId', p_session_id)
    );

    if v_session.mode = 'direct' then
      update public.sos_sessions
      set status = 'ended', ended_at = now(), ended_by = auth.uid()
      where id = p_session_id;
    end if;
  end if;
end;
$$;

grant execute on function public.respond_to_sos(uuid, boolean) to authenticated;

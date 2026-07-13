-- M3: cầu cứu (SOS) — sos_sessions + sos_responses + RLS + RPCs
--
-- Mô hình (xem CONTEXT.md §4):
-- - owner tạo 1 phiên, chọn mode 'broadcast' (tất cả lốp) hoặc 'direct' (1 người).
-- - Với direct: 1 row sos_responses cho spare được chọn. Nếu spare đó từ chối,
--   phiên kết thúc luôn (không auto-fallback ở MVP).
-- - Với broadcast: 1 row sos_responses cho mỗi lốp hiện có của owner tại thời điểm
--   tạo phiên. Bất kỳ ai đồng ý trước → phiên chuyển 'accepted', accepted_by = họ.
--   Người khác vẫn có thể xem đã có người nhận, nhưng không đổi được response nữa
--   (chặn ở RPC, không chặn bằng RLS để giữ policy đơn giản).
-- - Kết thúc: owner hoặc spare đang giúp (accepted_by) đều kết thúc được.

-- ============================================================
-- sos_sessions
-- ============================================================
create table public.sos_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('broadcast', 'direct')),
  target_spare_id uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'accepted', 'ended')),
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references public.profiles(id),
  check (mode <> 'direct' or target_spare_id is not null)
);

create index sos_sessions_owner_idx on public.sos_sessions (owner_id);
create index sos_sessions_status_idx on public.sos_sessions (status);

alter table public.sos_sessions enable row level security;

-- tạo/kết thúc phiên đi qua RPC security definer, không insert/update trực tiếp từ client
-- select policy cho sos_sessions được tạo bên dưới, sau khi có bảng sos_responses
-- (policy tham chiếu qua bảng đó).

-- ============================================================
-- sos_responses (1 row / spare được nhờ trong 1 phiên)
-- ============================================================
create table public.sos_responses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sos_sessions(id) on delete cascade,
  spare_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, spare_id)
);

create index sos_responses_session_idx on public.sos_responses (session_id);
create index sos_responses_spare_idx on public.sos_responses (spare_id);

alter table public.sos_responses enable row level security;

-- owner luôn xem được phiên của mình; spare xem được nếu có response record
-- (tức là nằm trong danh sách được nhờ, broadcast hoặc direct).
create policy "owner or invited spare can view session"
on public.sos_sessions for select
to authenticated
using (
  auth.uid() = owner_id
  or exists (
    select 1 from public.sos_responses r
    where r.session_id = sos_sessions.id and r.spare_id = auth.uid()
  )
);

-- owner của phiên hoặc chính spare đó mới xem được row
create policy "owner or the spare can view response"
on public.sos_responses for select
to authenticated
using (
  auth.uid() = spare_id
  or exists (
    select 1 from public.sos_sessions s
    where s.id = sos_responses.session_id and s.owner_id = auth.uid()
  )
);

-- insert/update đi qua RPC security definer

-- ============================================================
-- create_sos_session(p_mode, p_target_spare_id)
-- ============================================================
create function public.create_sos_session(p_mode text, p_target_spare_id uuid default null)
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
-- respond_to_sos(p_session_id, p_accept)
-- ============================================================
create function public.respond_to_sos(p_session_id uuid, p_accept boolean)
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
    -- người đầu tiên đồng ý sẽ "thắng" (session vẫn 'active' nhờ khoá for update ở trên
    -- chặn các respond_to_sos khác chạy đồng thời trên cùng session_id). Nếu ai đó đã
    -- nhận trước rồi (session không còn 'active') thì từ chối luôn, không đánh dấu
    -- response của mình là accepted để tránh hiện sai "đã đồng ý" trên UI.
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

    -- direct: từ chối = kết thúc phiên (CONTEXT.md §4.4)
    if v_session.mode = 'direct' then
      update public.sos_sessions
      set status = 'ended', ended_at = now(), ended_by = auth.uid()
      where id = p_session_id;
    end if;
  end if;
end;
$$;

grant execute on function public.respond_to_sos(uuid, boolean) to authenticated;

-- ============================================================
-- end_sos_session(p_session_id) — owner hoặc spare đang giúp đều kết thúc được
-- ============================================================
create function public.end_sos_session(p_session_id uuid)
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

  if v_session.status = 'ended' then
    return;
  end if;

  -- dùng IS DISTINCT FROM thay vì <>: khi accepted_by còn NULL (chưa ai nhận),
  -- "auth.uid() <> null" cho NULL chứ không phải true/false, khiến "NULL and true"
  -- cũng ra NULL và bị PL/pgSQL coi là false trong "if" — tức là bỏ qua guard này
  -- hoàn toàn và cho phép BẤT KỲ ai kết thúc phiên trước khi có người nhận (bug thật,
  -- phát hiện lúc test M3 bằng 3 tài khoản qua API).
  if auth.uid() is distinct from v_session.owner_id and auth.uid() is distinct from v_session.accepted_by then
    raise exception 'not_allowed';
  end if;

  update public.sos_sessions
  set status = 'ended', ended_at = now(), ended_by = auth.uid()
  where id = p_session_id;
end;
$$;

grant execute on function public.end_sos_session(uuid) to authenticated;

-- ============================================================
-- realtime: bật cho 2 bảng để owner/spare nhận cập nhật trạng thái tức thời
-- ============================================================
alter publication supabase_realtime add table public.sos_sessions;
alter publication supabase_realtime add table public.sos_responses;

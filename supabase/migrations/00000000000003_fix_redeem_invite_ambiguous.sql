-- M2 fix: đổi tên cột trả về của redeem_invite_code để tránh trùng với biến
-- v_invite.owner_id trong scope PL/pgSQL (lỗi "column reference owner_id is ambiguous")
drop function if exists public.redeem_invite_code(text);

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

  update public.invite_codes ic
  set used_at = now(), used_by = auth.uid()
  where ic.code = p_code;

  return query
    select p.id, p.display_name
    from public.profiles p
    where p.id = v_invite.owner_id;
end;
$$;

grant execute on function public.redeem_invite_code(text) to authenticated;

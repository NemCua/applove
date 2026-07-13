-- M2 fix #3: PL/pgSQL không cho qualify tên cột trong ON CONFLICT (...) bằng alias
-- bảng, nên chừng nào output column của function còn tên "owner_id" thì mọi
-- "on conflict (owner_id, ...)" bên trong đều bị coi là ambiguous. Đổi hẳn tên
-- output ra "result_owner_id" / "result_owner_display_name" để loại tận gốc.
drop function if exists public.redeem_invite_code(text);

create function public.redeem_invite_code(p_code text)
returns table (result_owner_id uuid, result_owner_display_name text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite public.invite_codes;
  v_owner_id uuid;
  v_owner_display_name text;
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

  v_owner_id := v_invite.owner_id;

  if v_owner_id = auth.uid() then
    raise exception 'cannot_redeem_own_code';
  end if;

  insert into public.spare_relationships (owner_id, spare_id)
  values (v_owner_id, auth.uid())
  on conflict (owner_id, spare_id) do nothing;

  update public.invite_codes ic
  set used_at = now(), used_by = auth.uid()
  where ic.code = p_code;

  select p.display_name into v_owner_display_name
  from public.profiles p
  where p.id = v_owner_id;

  return query select v_owner_id, v_owner_display_name;
end;
$$;

grant execute on function public.redeem_invite_code(text) to authenticated;

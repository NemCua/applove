-- M2 fix #2: mệnh đề insert cũng gặp "owner_id is ambiguous" vì trùng tên cột
-- output của function. Đổi tên biến output ra khác hẳn (v_owner_id / v_owner_name)
-- để loại hoàn toàn khả năng trùng, thay vì chỉ alias từng nơi.
drop function if exists public.redeem_invite_code(text);

create function public.redeem_invite_code(p_code text)
returns table (owner_id uuid, owner_display_name text)
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

  insert into public.spare_relationships as sr (owner_id, spare_id)
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

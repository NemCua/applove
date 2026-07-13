-- M2: owner_id tự lấy từ auth.uid() khi client insert, đỡ phải gửi tường minh
alter table public.invite_codes
  alter column owner_id set default auth.uid();

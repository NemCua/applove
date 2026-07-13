-- Trigger tự động gọi webhook Next.js (Vercel) mỗi khi có INSERT/UPDATE trên
-- sos_responses, để gửi Web Push. Dùng pg_net (net.http_post) gọi thẳng, không
-- cần Supabase Database Webhook qua Dashboard.
--
-- Secret xác thực webhook KHÔNG hardcode ở đây — đọc từ bảng private_config
-- (RLS khóa hoàn toàn, không có policy nào nên client không đọc được; chỉ hàm
-- security-definer này truy cập được). Secret được chèn riêng bằng lệnh SQL
-- ngoài file migration để tránh commit secret lên git. URL là domain production
-- cố định trên Vercel.
--
-- Setup thủ công (chạy 1 lần, KHÔNG ghi vào migration):
--   create table private_config (key text primary key, value text not null);
--   alter table private_config enable row level security;  -- không tạo policy nào
--   insert into private_config values ('webhook_secret', '<SUPABASE_WEBHOOK_SECRET>');

create or replace function public.notify_sos_webhook()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_payload jsonb;
  v_secret text;
begin
  select value into v_secret from public.private_config where key = 'webhook_secret';
  if v_secret is null or v_secret = '' then
    -- chưa cấu hình secret — bỏ qua im lặng, không chặn ghi sos_responses
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'record', to_jsonb(new),
    'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
  );

  perform net.http_post(
    url := 'https://lop-du-phong.vercel.app/api/webhooks/sos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := v_payload
  );

  return new;
end;
$$;

drop trigger if exists sos_responses_notify_insert on public.sos_responses;
create trigger sos_responses_notify_insert
  after insert on public.sos_responses
  for each row execute function public.notify_sos_webhook();

drop trigger if exists sos_responses_notify_update on public.sos_responses;
create trigger sos_responses_notify_update
  after update on public.sos_responses
  for each row execute function public.notify_sos_webhook();

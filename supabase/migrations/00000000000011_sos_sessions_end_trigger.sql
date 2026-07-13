-- Thêm trigger gọi webhook khi sos_sessions được UPDATE (dùng chung hàm
-- notify_sos_webhook đã tạo ở migration 00000000000010) — cần để báo cho spare
-- đang giúp biết khi owner kết thúc phiên ("đã ổn, không cần tới nữa").

drop trigger if exists sos_sessions_notify_update on public.sos_sessions;
create trigger sos_sessions_notify_update
  after update on public.sos_sessions
  for each row execute function public.notify_sos_webhook();

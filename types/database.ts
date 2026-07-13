// TODO: thay bằng type sinh tự động qua `supabase gen types typescript` sau khi
// migration đã áp dụng lên project thật. Để tạm `any` cho các bảng chưa tồn tại
// tránh chặn typecheck ở các mốc đầu.
export type Database = any;

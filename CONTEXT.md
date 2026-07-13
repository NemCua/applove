# CONTEXT.md — "Lốp Dự Phòng"

> File này là nguồn sự thật (source of truth) cho ý tưởng, yêu cầu và các quyết định thiết kế của app.
> Dùng để khôi phục ngữ cảnh cho AI hoặc người mới join nếu cuộc trò chuyện/lịch sử bị mất.
> Cập nhật file này mỗi khi có quyết định mới hoặc thay đổi phạm vi.

---

## 1. Ý tưởng gốc

Tên gọi "Lốp dự phòng" lấy cảm hứng từ khái niệm trong tình yêu: một người chỉ được coi là
phương án thay thế, giữ lại để lấp đầy khoảng trống cảm xúc hoặc chờ đợi khi mối quan hệ chính
gặp trục trặc — mối quan hệ bất đối xứng, một người chủ động kiểm soát, người kia bị động chờ đợi.

App này **mượn khái niệm trên làm trò đùa vui giữa bạn bè**, KHÔNG nhằm mục đích thao túng,
lừa dối hay gây tổn hại thực sự cho ai. Đây là mạng xã hội thu nhỏ, riêng tư, chỉ dùng trong
một nhóm bạn bè quen biết nhau ngoài đời, với tính năng chính là "cầu cứu" khi gặp sự cố
(hết xăng, bể bánh xe, xe hỏng giữa đường...).

**Nguyên tắc thiết kế quan trọng:** mô hình dữ liệu là quan hệ **sở hữu** (ownership), không
phải quan hệ bạn bè hai chiều ngang hàng. Khi A thêm B làm "lốp", đây là một record một chiều
thuộc về A — không tự động tạo quan hệ ngược lại.

---

## 2. Đối tượng & phạm vi sử dụng

- Dùng trong nhóm bạn bè nhỏ, biết nhau ngoài đời thực.
- Không phải app public/mở rộng đại trà — không cần SEO, không cần app store optimization,
  không cần hệ thống chống spam phức tạp ở giai đoạn đầu.
- MVP nhắm tới: dùng thử được với vài người bạn, qua cài đặt "tin cậy nhà phát triển" trên
  iPhone (xem mục 8 — Deploy) và/hoặc APK trực tiếp trên Android.

---

## 3. Mô hình quan hệ "Lốp" (Spare Tire Relationship)

- Quan hệ là **bất đối xứng và không giới hạn số lượng**:
  - A có thể thêm nhiều người làm lốp của A.
  - B có thể vừa là lốp của A, vừa có lốp riêng của B (2 quan hệ độc lập, không liên quan nhau).
  - Không có ràng buộc "một người chỉ được là lốp của duy nhất một người".
- **Cách tạo quan hệ — qua mã mời:**
  1. Tài khoản A vào app, bấm "Thêm lốp" → hệ thống sinh ra **1 mã mời mới** (unique, có thể
     có hạn dùng/số lần dùng — TBD, xem mục 10).
  2. A gửi mã này cho B (ngoài app — qua tin nhắn, nói miệng, v.v.).
  3. B nhập mã mời vào app → B chính thức trở thành **lốp của A**.
  4. Sau khi xác nhận, quan hệ được ghi vào DB: `owner_id = A`, `spare_id = B`.
- Thuật ngữ trong schema/code nên dùng rõ ràng: **owner** (người sở hữu, người tạo mã mời,
  người sẽ gửi cầu cứu) và **spare** (người bị thêm làm lốp, người nhận cầu cứu và có thể
  đồng ý/từ chối).
- Một tài khoản có 2 vai trò tiềm năng cùng lúc: là **owner** của danh sách lốp riêng của mình,
  và có thể đồng thời là **spare** trong danh sách của người khác (nhiều người khác nhau).

---

## 4. Chức năng chính: Cầu cứu (SOS)

### 4.1 Kích hoạt
- Owner đang gặp sự cố (hết xăng, bể bánh xe, xe hỏng...) → mở app → bấm nút **Cầu cứu**.
- Owner chọn 1 trong 2 chế độ:
  - **Nhờ tất cả các lốp** — gửi yêu cầu cầu cứu (broadcast) đến toàn bộ danh sách lốp của
    owner đó cùng lúc.
  - **Nhờ một người cụ thể** — chọn 1 lốp trong danh sách, chỉ gửi yêu cầu cho người đó.

### 4.2 Phía người nhận (spare)
- Spare nhận được thông báo cầu cứu, thấy rõ owner nào đang cầu cứu.
- Spare có 2 lựa chọn: **Đồng ý** hoặc **Từ chối**.
- Dù chọn gì, kết quả đều phải **gửi thông báo ngược lại cho owner** (owner biết ai đồng ý,
  ai từ chối).

### 4.3 Sau khi có người đồng ý
- Khi 1 spare bấm Đồng ý:
  - App bắt đầu **chia sẻ vị trí của owner theo thời gian thực (realtime)** cho spare đó,
    liên tục cập nhật cho tới khi phiên cầu cứu kết thúc.
  - Trạng thái tài khoản owner hiển thị (với spare đang giúp) là **"đang được [spare] giúp"**
    hoặc tương đương — tức là các spare khác/chính owner có thể thấy trạng thái phiên cầu cứu
    hiện tại.

### 4.4 Trường hợp từ chối / không phản hồi (MVP — chốt đơn giản trước)
- Nếu spare được chọn (trường hợp "nhờ một người cụ thể") từ chối hoặc không phản hồi:
  **phiên cầu cứu đó coi như kết thúc**. Owner phải tự tạo lại yêu cầu cầu cứu mới theo cách
  thủ công (không có auto-fallback sang "nhờ tất cả" ở bản đầu).
- Ghi chú: fallback tự động (tự chuyển sang broadcast toàn bộ lốp khi bị từ chối) là ý tưởng
  hay cho v2 nhưng **không làm ở MVP** để giữ logic đơn giản.

### 4.5 Kết thúc phiên cầu cứu
- TBD: cần chốt ai có quyền kết thúc phiên (chỉ owner? cả spare đang giúp cũng được?),
  và điều gì xảy ra khi kết thúc (dừng chia sẻ vị trí, lưu lịch sử hay xoá luôn?).

---

## 5. Xác thực & tài khoản

- App có tạo tài khoản và đăng nhập (email/password ở mức tối thiểu cho MVP — có thể mở rộng
  Google/Apple sign-in sau, TBD).
- Không có vai trò admin/mod phức tạp — mỗi tài khoản chỉ quản lý danh sách lốp của chính mình.

---

## 6. Dữ liệu & Backend

- **Database chính:** PostgreSQL.
- **Quyết định hạ tầng (khuyến nghị — cần bạn xác nhận):**
  Ban đầu người dùng đề xuất dùng **Neon** (Postgres serverless thuần). Tuy nhiên vì app cần
  **vị trí realtime** (cập nhật liên tục trong lúc cầu cứu) và **thông báo tức thời** (khi
  spare đồng ý/từ chối), nếu dùng Neon thuần sẽ phải tự dựng thêm 1 lớp WebSocket server riêng
  (vd Socket.io) để xử lý phần realtime — tốn công vận hành thêm cho một người làm một mình.

  **Khuyến nghị: dùng Supabase thay cho Neon thuần.** Lý do:
  - Supabase = Postgres (tương thích hoàn toàn với tư duy schema Postgres đã định hướng)
    + Auth + Realtime (subscribe thay đổi dữ liệu qua WebSocket có sẵn) + Storage, tất cả
    trong 1 dịch vụ, có gói miễn phí đủ dùng cho quy mô vài chục người dùng.
  - Giảm hẳn phần hạ tầng phải tự vận hành so với "Neon + WebSocket server riêng".
  - Nếu sau này thấy Supabase không đáp ứng đủ, schema Postgres vẫn migrate được sang Neon
    hoặc hạ tầng khác vì bản chất vẫn là Postgres chuẩn.

  → **Trạng thái: đang chờ người dùng xác nhận** có đổi từ Neon sang Supabase hay không,
  hoặc giữ Neon + tự chọn giải pháp realtime riêng (Pusher/Ably/Socket.io tự host).

- **Vị trí realtime:** dùng kênh realtime (Supabase Realtime, hoặc WebSocket riêng nếu giữ
  Neon) để owner gửi tọa độ liên tục trong lúc có phiên cầu cứu đang active; chỉ (các) spare
  đã đồng ý mới nhận được stream vị trí đó.
- **Thông báo (notification):** cần xác nhận dùng push notification thật (Expo Notifications /
  FCM / APNs) hay chỉ cần in-app realtime update là đủ cho MVP — TBD.

---

## 7. Stack kỹ thuật đã chọn

- **Framework:** Expo (React Native), viết bằng **TypeScript**.
- **Bản đồ & vị trí:** `expo-location` (lấy GPS), `react-native-maps` (hiển thị bản đồ) — đã
  cài đặt sẵn trong project, có demo cơ bản ở [App.tsx](App.tsx).
- **Database:** PostgreSQL — cụ thể Neon hay Supabase, xem mục 6 (đang chờ xác nhận).
- **Lưu ý môi trường:** Node hiện tại trên máy dev là v20.9.0, một số package (React Native
  0.86, Metro, react-native-maps) khuyến nghị Node ≥ 20.19.4 — chưa gây lỗi nhưng nên nâng cấp
  Node nếu gặp lỗi build khó hiểu về sau.

---

## 8. Deploy / Phân phối (đã thảo luận trước, ghi lại để nhớ)

- **Android:** dễ, có thể build APK và cài trực tiếp (sideload) miễn phí, hoặc phát hành
  Google Play với phí $25 một lần.
- **iOS:** Apple không cho phép sideload tự do như Android.
  - Người dùng đã xác nhận **giai đoạn test sẽ dùng cách cấp phép qua "tin cậy nhà phát triển"
    trên iPhone** (free Apple ID qua Xcode/EAS, cài trực tiếp vào máy qua cáp) — chấp nhận
    giới hạn: app tự hết hạn sau 7 ngày, phải kết nối lại máy Mac để refresh.
  - Đây CHỈ phù hợp cho vòng test nội bộ với số lượng bạn bè rất nhỏ, không phải giải pháp
    phát hành chính thức lâu dài.
  - Khi cần phát hành thật/ổn định hơn cho nhiều bạn bè cùng lúc: cân nhắc TestFlight
    (Apple Developer Program $99/năm, hỗ trợ tới 10,000 tester, ổn định, chính thống).
  - **Đã loại bỏ hướng "Enterprise Certificate lạm dụng"** (cách mà nhiều app lậu/cờ bạc hay
    dùng) vì rủi ro bị Apple revoke hàng loạt bất ngờ và vùng xám pháp lý — không dùng cho
    app này.

---

## 9. Ngoài phạm vi MVP (v2 / để sau)

- Auto-fallback: tự động chuyển sang "nhờ tất cả lốp" khi người được chọn từ chối/không phản hồi.
- Đăng nhập qua Google/Apple.
- Lịch sử các phiên cầu cứu trước đây.
- Vai trò/quyền phức tạp hơn (nhóm, admin...).
- Bất kỳ tính năng mạng xã hội mở rộng nào khác (chat, feed, reaction...) — hiện tại KHÔNG
  nằm trong mô tả gốc, chỉ thêm nếu người dùng yêu cầu rõ ràng sau này.

---

## 10. Quyết định đã chốt (2026-07-13)

1. **Backend:** dùng **Supabase** (Postgres + Auth + Realtime + Storage trong 1 dịch vụ).
   Neon bị loại vì sẽ cần tự dựng thêm WebSocket server riêng cho phần realtime.
2. **Push notification:** dùng **Expo Notifications** (push thật, hiện kể cả khi app đóng) —
   bắt buộc cho MVP vì đây là tính năng khẩn cấp, không thể chỉ trông chờ người nhận đang mở app.
3. **Mã mời:** dùng **1 lần**, tự **hết hạn sau 24 giờ** kể từ lúc tạo. Mỗi lần owner muốn
   thêm 1 người phải tạo mã mới.
4. **Xoá quan hệ lốp:** **hai chiều đều xoá được** — owner xoá 1 lốp khỏi danh sách bất kỳ
   lúc nào; spare cũng có thể tự rời khỏi vai trò "là lốp của X" nếu không muốn nữa.
5. **Kết thúc phiên cầu cứu:** **cả owner lẫn spare đang giúp** đều có quyền kết thúc phiên
   (owner bấm "đã ổn/xong rồi", hoặc spare bấm "đã tới nơi/xong việc") — ai xong trước cũng
   kết thúc được, không chờ phải là owner.
6. **Tự động hết hạn phiên:** nếu không ai tương tác (không có hoạt động/không bấm kết thúc)
   trong **2 giờ**, hệ thống tự động dừng chia sẻ vị trí và đóng phiên — phòng trường hợp quên
   tắt, đỡ hao pin và giảm rủi ro rò rỉ vị trí kéo dài.

### Còn để sau (chưa cần chốt ngay cho MVP)
- Đăng nhập: bắt đầu bằng email/password; Google/Apple sign-in để v2.
- Dữ liệu phiên cầu cứu sau khi kết thúc: lưu lịch sử hay xoá hẳn — quyết định khi thiết kế
  bảng `sos_sessions`, không chặn việc bắt đầu code.

---

## 11. Ghi chú vận hành Supabase

- Project: `applove` (ref `ourwtfduffytqmfuicim`), region Sydney (Oceania).
- **Direct connection (`db.*.supabase.co`) dùng IPv6 — không kết nối được từ mạng hiện tại
  của máy dev (lỗi DNS).** Luôn dùng **Session pooler** để chạy SQL thủ công từ local:
  `postgresql://postgres.ourwtfduffytqmfuicim@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`
  (mật khẩu DB nhập qua `PGPASSWORD`, không hard-code vào file).
- Supabase CLI: không cài qua Homebrew được (máy thiếu Command Line Tools cập nhật) — dùng
  `npx supabase <command>` thay vì cài global. Đã chạy `npx supabase init` (tạo
  `supabase/config.toml`), chưa `login`/`link` (đang áp migration trực tiếp qua `psql` +
  connection pooler ở trên thay vì qua CLI push).
- Migration `00000000000001_init.sql` đã áp dụng thành công lên project thật (bảng
  `profiles`, `spare_relationships`, `invite_codes` + RLS + RPC `redeem_invite_code`).
- **Lưu ý bảo mật:** secret key gốc đã bị dán vào chat 1 lần khi setup — cần rotate lại trong
  Supabase dashboard (Project Settings → API Keys) khi có dịp, chưa làm. Một Management API
  token (`sbp_...`) cũng đã được tạo và dùng để bật `mailer_autoconfirm` qua
  `PATCH /v1/projects/{ref}/config/auth` — user cần tự thu hồi token này tại
  supabase.com/dashboard/account/tokens sau khi dùng xong.
- **Auto-confirm email đã bật** (`mailer_autoconfirm: true`) qua Management API — người dùng
  đăng ký xong đăng nhập được ngay, không cần bấm link xác nhận trong email. Phù hợp MVP test
  với nhóm bạn bè nhỏ, tin cậy nhau.
- **Bẫy PL/pgSQL cần nhớ khi viết RPC tương tự:** nếu `returns table (owner_id uuid, ...)`,
  bất kỳ chỗ nào trong thân function nhắc tới cột tên `owner_id` (kể cả trong mệnh đề
  `ON CONFLICT (owner_id, ...)`, vốn không cho phép qualify bằng alias bảng) đều bị Postgres
  coi là "ambiguous" vì trùng tên biến output ngầm định của function. Giải pháp chắc ăn nhất:
  đặt tên cột output khác hẳn tên cột thật trong bảng (đã áp dụng: đổi thành
  `result_owner_id`/`result_owner_display_name` trong `redeem_invite_code`, xem migration
  00000000000005). `invite_codes.owner_id` cũng cần `default auth.uid()` (migration
  00000000000002) vì RLS insert policy check `auth.uid() = owner_id` sẽ fail nếu client
  không tự gửi giá trị này.

## 12. Lịch sử cập nhật

- **2026-07-13** — Khởi tạo file context từ buổi trao đổi ý tưởng đầu tiên. Đã chốt: mô hình
  quan hệ sở hữu bất đối xứng không giới hạn, luồng cầu cứu 2 chế độ (tất cả / một người),
  từ chối = kết thúc phiên (không auto-fallback ở MVP), đề xuất Supabase thay Neon cho phần
  realtime (chờ xác nhận), giữ nguyên hướng deploy iOS qua "tin cậy nhà phát triển" cho giai
  đoạn test.

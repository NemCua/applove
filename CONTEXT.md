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

> **QUAN TRỌNG (2026-07-14):** Dự án đã **chuyển từ Expo/React Native sang Next.js (web app
> / PWA)**. Lý do đầy đủ ở mục 13. Toàn bộ backend Supabase (schema, RLS, RPC, migration
> M1–M4) giữ nguyên; chỉ phần client được viết lại. Stack cũ (Expo) chỉ còn giá trị lịch sử.

- **Framework hiện tại:** **Next.js 16 (App Router, Turbopack) + TypeScript + Tailwind v4**,
  host trên **Vercel**, chạy như PWA (Add to Home Screen trên iOS để có Web Push).
  - Supabase client qua `@supabase/ssr` (`lib/supabase/client.ts` cho browser,
    `server.ts` cho server component, `proxy.ts` cho middleware refresh session).
  - Next.js 16 đổi tên `middleware` → `proxy` (file `proxy.ts` ở root). Dynamic route params
    là Promise (dùng `useParams()` ở client component).
- **Bản đồ & vị trí:** `navigator.geolocation.watchPosition` (GPS trình duyệt) +
  **Leaflet/react-leaflet** (bản đồ, OpenStreetMap tiles — miễn phí, không cần API key). Map
  render client-only qua `next/dynamic` với `ssr: false` (`components/OwnerLocationMap.tsx`).
- **Push notification:** **Web Push (VAPID)** thay cho Expo Notifications. Service Worker
  ở `public/sw.js`, đăng ký subscription qua `lib/push-client.ts`, gửi push từ Next.js API
  route `app/api/webhooks/sos/route.ts` (dùng thư viện `web-push`), được Supabase Database
  Webhook / trigger gọi tới khi có INSERT/UPDATE trên `sos_responses`.
- **Database:** Supabase (PostgreSQL) — không đổi.
- **Môi trường dev:** Node đã nâng lên v24.18.0 LTS qua nvm (xem lịch sử 2026-07-14).

### Stack cũ (Expo — đã bỏ, chỉ để tham khảo lịch sử)
- Expo SDK 54 (React Native), `expo-location`, `react-native-maps`, `expo-notifications`.
- Vẫn xem được qua git history nếu cần khôi phục logic.

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
- **2026-07-13** — M3 hoàn tất (SOS cơ bản). Migration
  `00000000000006_sos_sessions.sql`: bảng `sos_sessions` (mode broadcast/direct, status
  active/accepted/ended, accepted_by/ended_by) + `sos_responses` (1 row/spare được nhờ mỗi
  phiên) + RLS + 3 RPC (`create_sos_session`, `respond_to_sos`, `end_sos_session`) + bật
  Supabase Realtime cho cả 2 bảng. 3 màn hình: `sos/new` (chọn broadcast/direct + target),
  `sos/[sessionId]` (owner theo dõi phản hồi, có thể kết thúc), `sos/incoming/[sessionId]`
  (spare đồng ý/từ chối). Home screen subscribe realtime, hiện banner "đang cầu cứu" (owner)
  và "X đang cần giúp" (spare) tự động không cần push (push thật để M5).

  Verify bằng 3 tài khoản thật qua API (curl + RPC), phát hiện và sửa **2 lỗi thật**:
  1. **RLS đệ quy vô hạn** (`infinite recursion detected in policy`): policy select của
     `sos_sessions` tham chiếu `sos_responses`, và policy select của `sos_responses` tham
     chiếu ngược lại `sos_sessions` → Postgres coi là vòng lặp. Sửa bằng cách tạo hàm
     `is_sos_session_owner(p_session_id)` (`security definer`, bỏ qua RLS) để
     `sos_responses` dùng thay vì subquery trực tiếp vào `sos_sessions`.
  2. **Bẫy NULL trong PL/pgSQL `if` (nghiêm trọng — lỗi phân quyền)**: guard trong
     `end_sos_session` viết `auth.uid() <> v_session.owner_id and auth.uid() <>
     v_session.accepted_by` — khi `accepted_by` còn NULL (chưa ai nhận), phép so sánh
     `<> NULL` trả về NULL chứ không phải true/false, và `NULL and true` cũng ra NULL, bị
     PL/pgSQL `if` coi là false → **bỏ qua toàn bộ guard**, cho phép BẤT KỲ người dùng nào
     (kể cả không liên quan gì tới phiên) kết thúc phiên cầu cứu của người khác miễn là
     chưa có ai đồng ý giúp. Sửa bằng `is distinct from` thay cho `<>` ở mọi so sánh với
     cột có thể NULL. **Ghi nhớ cho code sau:** không bao giờ dùng `<>`/`=` trực tiếp với
     cột nullable trong điều kiện `if`/`where` của PL/pgSQL nếu muốn NULL được xử lý như
     "khác giá trị đó" — luôn dùng `is distinct from` / `is not distinct from`.
  3. Race broadcast (nhiều spare cùng bấm "đồng ý"): `select ... for update` trên
     `sos_sessions` trong `respond_to_sos` serialize các lệnh gọi đồng thời cùng
     session_id, nên request tới sau sẽ thấy `status <> 'active'` và bị chặn với lỗi
     `already_taken_by_someone_else` — không còn bị đánh dấu nhầm `sos_responses.status =
     'accepted'` cho người thua cuộc đua (bug đã sửa, không phải chỉ ở session, còn ở
     response row).
- **2026-07-14** — Sửa môi trường dev chạy thử app thật + 3 bug thêm phát hiện lúc chạy thử:
  - **Môi trường:** máy dev có Node v20.9.0 (không đủ `>= 20.19.4` mà Expo SDK 57 yêu cầu,
    lỗi cứng chứ không chỉ warning) → cài `nvm` (chưa từng có trên máy), cài Node LTS mới
    (v24.18.0) làm mặc định. Điện thoại test chỉ có Expo Go bản hỗ trợ tối đa **SDK 54**,
    trong khi project ở SDK 57 → hạ toàn bộ xuống SDK 54 bằng `npx expo install expo@^54.0.0`
    rồi `npx expo install --fix`, xoá `node_modules`/`package-lock.json` cài lại sạch (tránh
    xung đột peer dependency giữa version cũ/mới còn kẹt trong lockfile). **Lưu ý:** máy dev
    có 1 bản `expo-cli` global cũ ở `/opt/homebrew/bin/expo` (deprecated) — luôn gõ
    `npx expo start`, không gõ `expo start` trơn, nếu không sẽ chạy nhầm CLI cũ.
  - **Bug cấu hình có sẵn — `react-native-maps` bị khai nhầm là Expo config plugin** trong
    mảng `plugins` của `app.json`. Package này không có `app.plugin.js`/không export config
    plugin thật, nên khi Expo CLI cố `require()` trực tiếp (không qua Metro/Babel) để tìm
    plugin, nó đọc phải JSX thô trong `lib/MapView.js` và sập với
    `SyntaxError: Unexpected token '<'`. Sửa: bỏ hẳn entry `"react-native-maps"` khỏi
    `plugins` — thư viện vẫn dùng bình thường như component, chỉ không phải khai plugin.
  - **Thiếu `react-native-web`/`react-dom`** để chạy `expo start` (nhấn `w`)/web — chưa từng
    cài từ đầu. Cài qua `npx expo install react-native-web react-dom` để lấy đúng version
    theo SDK 54. Lưu ý: `react-native-maps` không chạy được trên web thật sự — màn hình bản
    đồ (M4) có thể lỗi/trắng trên web, nhưng các màn hình hiện tại không dùng map nên không
    ảnh hưởng.
  - **Bug thật — Supabase Realtime channel bị tạo trùng khi effect chạy 2 lần** (React
    Strict Mode / fast refresh trên web dev): `.channel(name).on(...).on(...).subscribe()`
    gọi lần 2 trước khi cleanup lần 1 kịp gỡ channel cũ → lỗi
    `cannot add postgres_changes callbacks ... after subscribe()`. Sửa ở cả 3 nơi
    (`home.tsx`, `sos/[sessionId].tsx`, `sos/incoming/[sessionId].tsx`): trước khi tạo
    channel mới, tự tìm và `removeChannel()` channel cùng tên (`topic`) còn sót lại qua
    `supabase.getChannels()`, không chỉ dựa vào cleanup function của `useEffect`.
  - **Bug thật (nghiêm trọng) — "là lốp của chính mình"**: `listMySpares()` và
    `listOwnersOfMe()` trong `lib/api/spares.ts` không tự lọc theo `auth.uid()`, chỉ dựa vào
    RLS. Nhưng RLS policy của `spare_relationships` cho phép đọc row nếu bạn là owner HOẶC
    spare — tức là **cùng 1 row owner đọc được y hệt spare đọc được**. Owner gọi
    `listOwnersOfMe()` vẫn nhận về đúng row mà chính họ là owner (vì RLS không chặn), rồi
    code map `row.owner` → hiển thị nhầm "tôi là lốp của [chính tôi]". **Ghi nhớ:** RLS chỉ
    kiểm soát *quyền đọc 1 row*, không kiểm soát *row đó thuộc danh sách nào trên UI* — khi
    1 bảng có 2 vai trò khác nhau (owner/spare) cùng được phép đọc, luôn phải tự thêm
    `.eq('owner_id', myId)` / `.eq('spare_id', myId)` ở phía client cho đúng danh sách, không
    được suy diễn từ RLS. Đã sửa cả 2 hàm, verify lại bằng 2 tài khoản thật
    (`thuyduong@gmail.com` là owner, tài khoản còn lại là spare) qua API — kết quả đúng.
- **2026-07-14** — M4 hoàn tất (vị trí realtime khi đang cầu cứu). Migration
  `00000000000007_sos_locations.sql`: bảng `sos_locations` (1 row/session, UPSERT đè vị trí
  cũ — không lưu lịch sử đường đi, xem CONTEXT.md §4.3) + RLS (chỉ owner hoặc
  `accepted_by` của phiên mới đọc được) + RPC `update_sos_location` (chỉ owner của phiên gọi
  được, và chỉ khi `status = 'accepted'` — chưa ai nhận thì chưa bật GPS, đỡ hao pin) + bật
  Realtime. Owner (`sos/[sessionId].tsx`) tự `watchPositionAsync` (accuracy High, mỗi 4s hoặc
  di chuyển 10m) khi phiên chuyển `accepted`, tự dừng khi phiên kết thúc hoặc unmount. Spare
  đã accept (`sos/incoming/[sessionId].tsx`) subscribe `sos_locations` qua Realtime, hiển thị
  `react-native-maps` với marker vị trí owner cập nhật tức thời + nút "Chỉ đường tới đây" mở
  Google Maps.

  Verify toàn bộ qua API thật (2 tài khoản `thuyduong@gmail.com`/owner và
  `abc05122005@gnail.com`/spare, cộng 1 tài khoản lạ tạo riêng để test RLS): gửi vị trí trước
  khi accepted bị chặn (`session_not_accepted`), gửi sau khi accepted thành công, cập nhật
  lần 2 đúng là UPSERT (vẫn 1 row, không phình bảng), người lạ không đọc được vị trí (RLS) và
  không giả làm owner để ghi được (`not_allowed`), gửi vị trí sau khi phiên `ended` bị chặn
  đúng. Không phát hiện bug mới ở phần backend lần này — các RPC đều dùng `is distinct from`
  ngay từ đầu theo bài học từ M3.
- **2026-07-14 — QUYẾT ĐỊNH LỚN: chuyển từ Expo/React Native sang Next.js (web/PWA).** Bối
  cảnh: khi build app native iOS để test push thật, phát hiện chuỗi rào cản của Apple:
  (1) Expo Go từ SDK 53+ **không còn hỗ trợ remote push** — chỉ development build mới có;
  (2) build/ký app iOS qua EAS cloud **bắt buộc Apple Developer Program $99/năm** (không còn
  tier miễn phí — nút "Enroll" trên developer.apple.com nay luôn là gói trả phí); (3) cách
  "tin cậy nhà phát triển" miễn phí (CONTEXT.md §8) chỉ ký được qua **Xcode cắm cáp local**,
  không dùng được EAS cloud. Người dùng không muốn trả $99, cũng không muốn cài Xcode.
  - Đã cân nhắc Web Push trên iOS: nghiên cứu kỹ (agent research) cho thấy có rủi ro
    subscription tự chết âm thầm, mất ở EU, yêu cầu Add-to-Home-Screen — **về lý thuyết không
    lý tưởng cho app khẩn cấp.** Nhưng người dùng đã **tự test thực tế trên iPhone của mình
    và xác nhận Web Push chạy tốt** → quyết định chấp nhận đánh đổi, chuyển hẳn sang web để
    được miễn phí + không phụ thuộc Apple. (Nhóm bạn bè nhỏ, không ở EU, nên các rủi ro trên
    ít ảnh hưởng thực tế.)
  - **Bỏ Expo Notifications**, migration `00000000000009_web_push_migration.sql`: đổi
    `push_tokens` từ `expo_push_token` (1 cột) sang Web Push subscription (`endpoint`,
    `p256dh`, `auth`); gỡ hàm `send_push_notification`/pg_net khỏi các RPC (create_sos_session,
    respond_to_sos) — việc gửi push chuyển sang Next.js API route.
  - Viết lại toàn bộ 8 màn hình bằng React/Next.js + Tailwind, tái dùng 100% logic API từ git
    history (chỉ đổi `View/Text/StyleSheet` → `div/p/className`, `expo-location` →
    `navigator.geolocation`, `react-native-maps` → Leaflet, `Alert` → `alert/confirm`,
    `Share` → `navigator.share`). Backend Supabase không đổi.
  - **Đã verify Web Push thật chạy end-to-end:** gọi `POST /api/webhooks/sos` với secret đúng
    → gửi push tới `web.push.apple.com`, iPhone (tài khoản `abc05122005@gmail.com`) nhận được
    thông báo "🆘 thuyduong đang cần giúp!". Webhook trả 401 khi thiếu auth (đúng).
  - **Bug đã sửa lúc test:** (a) `proxy.ts` matcher ban đầu áp lên cả `/api/*` → redirect
    webhook về `/login` (401→303). Sửa: thêm `api` vào negative-lookahead của matcher.
    (b) `autoCapitalize="none"` (thuộc tính RN) vô nghĩa trên web — bỏ qua, không phải nguồn
    lỗi login. (c) Email tài khoản test `abc0512` bị gõ sai `@gnail.com` từ lúc đăng ký M1 —
    sửa trực tiếp qua SQL update `auth.users.email` + `auth.identities.identity_data->email`.
  - **CÒN LẠI của M5:** cấu hình để trigger tự động gọi webhook (Database Webhook qua Dashboard
    hoặc trigger `pg_net` tự viết) mỗi khi INSERT/UPDATE `sos_responses` — cần URL cố định nên
    **quyết định deploy lên Vercel trước**, rồi trỏ webhook vào URL Vercel. Env cần set trên
    Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
    `SUPABASE_WEBHOOK_SECRET` (giá trị trong `.env` local, KHÔNG commit).
  - **Lưu ý bảo mật:** `service_role` key và VAPID private key nằm trong `.env` (đã gitignore).
    `allowedDevOrigins: ['*.ngrok-free.app']` trong next.config.ts chỉ phục vụ test dev qua
    ngrok — vô hại trên production nhưng có thể siết lại sau.
  - **M5 hoàn tất (2026-07-14):** deploy production tại `https://lop-du-phong.vercel.app`
    (Vercel project `lop-du-phong`, team `nemcuaa1-2418s-projects`, kết nối GitHub repo
    `NemCua/applove`, tự deploy khi push `master`). 6 env vars đã set trên cả 3 môi trường
    (production/preview/development) qua `vercel env add`.
    - **Trigger tự động** (không qua Supabase Dashboard, dùng `pg_net` trực tiếp — migration
      `00000000000010`/`00000000000011`): hàm `notify_sos_webhook()` gọi
      `net.http_post` tới webhook Vercel mỗi khi INSERT/UPDATE `sos_responses` hoặc UPDATE
      `sos_sessions`. Secret đọc từ bảng `private_config` (RLS khoá hoàn toàn, không có
      policy nào — chỉ hàm `security definer` đọc được), KHÔNG hardcode trong file migration
      (tránh leak khi commit). Setup 1 lần ngoài migration:
      `insert into private_config values ('webhook_secret', '<SUPABASE_WEBHOOK_SECRET>')`.
    - Webhook route (`app/api/webhooks/sos/route.ts`) xử lý 3 sự kiện: spare mới được nhờ
      (INSERT sos_responses) → báo spare; spare đồng ý/từ chối (UPDATE sos_responses) → báo
      owner; **owner kết thúc phiên** (UPDATE sos_sessions, status→ended) → báo spare đang
      giúp "đã ổn, không cần tới nữa" (thêm sau khi user phản hồi thiếu tính năng này).
    - **Bug đã sửa:** trang chủ không tự refresh khi quay lại sau khi kết thúc phiên ở màn
      hình khác — do Next.js App Router không unmount lại component khi
      `router.replace('/')` từ route khác, nên `useEffect([])` chỉ chạy 1 lần lúc mount đầu
      tiên. Sửa: đổi dependency thành `[load, pathname]` (dùng `usePathname()`) để tự fetch
      lại mỗi khi điều hướng về `/`.
    - Verify end-to-end qua API thật (không qua UI): tạo session → accept → end, cả 3 lần
      gọi webhook đều trả `200 {"ok":true}`, push tới iPhone thật xác nhận nhận được ở cả 3
      mốc (mời/đồng ý/kết thúc).
- **2026-07-14 — Nâng cấp bản đồ lên 2 chiều + giao diện dark mode.** Trước đó chỉ owner gửi
  vị trí cho spare xem (1 chiều, M4). Theo yêu cầu user ("lốp nhận nhiệm vụ cũng cập nhật vị
  trí realtime", "bản đồ đẹp/trẻ trung hơn"):
  - Migration `00000000000012`: đổi khoá chính `sos_locations` từ `session_id` (1 row/phiên)
    sang `(session_id, profile_id)` (1 row/người/phiên) — giờ chứa cả vị trí owner lẫn spare
    đang giúp. RLS mới: cả owner và `accepted_by` xem được vị trí của NHAU (trước chỉ owner
    ghi, spare đọc một chiều). RPC `update_sos_location` bỏ ràng buộc "chỉ owner gọi được",
    giờ cho phép cả owner lẫn accepted_by tự gửi vị trí của chính mình (nhận diện qua
    `auth.uid()`, không cần tham số role).
    - **Lỗi gặp lúc migrate (đã xử lý)**: `alter table ... drop constraint pkey` xong không
      thể `alter column set not null` ngay vì có 6 row cũ với `profile_id` NULL (chưa
      backfill) — Postgres báo lỗi rõ ràng, phải chạy UPDATE backfill (gán `profile_id =
      owner_id` từ `sos_sessions`) TRƯỚC khi set NOT NULL/primary key. Đã cập nhật lại thứ tự
      trong file migration cho khớp thực tế đã chạy.
  - `components/SosMap.tsx` (thay `OwnerLocationMap.tsx` cũ): CartoDB Dark Matter tiles
    (`{s}.basemaps.cartocdn.com/dark_all`, miễn phí không cần API key) khớp theme tối của
    app; marker tự vẽ bằng CSS (chấm tròn + vòng pulse animation) thay icon pin mặc định xấu
    của Leaflet; hỗ trợ nhiều điểm cùng lúc với `fitBounds` tự động zoom vừa khung hình cả 2
    người. Cả 2 màn hình SOS giờ tự `watchPosition` gửi vị trí của chính mình khi phiên
    `accepted`, và hiển thị cả 2 điểm (owner màu cam `accent`, spare màu xanh `calm`) trên
    cùng bản đồ.
  - Verify qua API thật: owner và spare cùng gửi vị trí, cả 2 phía đều đọc được đúng cả 2
    điểm qua `sos_locations`; người lạ không liên quan vẫn bị RLS chặn hoàn toàn.

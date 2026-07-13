import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient as createServiceClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:nemcuaa1@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Payload gửi bởi Supabase Database Webhook khi có INSERT trên sos_responses.
// Cấu hình qua Dashboard: Database → Webhooks → tạo webhook trên bảng
// sos_responses, event INSERT, gọi tới URL này với header
// Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>.
type WebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
};

function getServiceClient() {
  // service_role key bắt buộc ở đây vì route này chạy không có phiên đăng nhập
  // của user nào — cần đọc profiles/push_tokens của người NHẬN thông báo, không
  // phải người gửi request.
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function sendPush(supabase: ReturnType<typeof getServiceClient>, profileId: string, title: string, body: string, data: Record<string, any>) {
  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('endpoint, p256dh, auth')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!tokenRow) return;

  const subscription = {
    endpoint: tokenRow.endpoint,
    keys: { p256dh: tokenRow.p256dh, auth: tokenRow.auth },
  };

  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, data }));
  } catch (err: any) {
    // 410 Gone / 404 nghĩa là subscription đã hết hạn phía trình duyệt — xoá để
    // không thử gửi lại vô ích các lần sau.
    if (err.statusCode === 410 || err.statusCode === 404) {
      await supabase.from('push_tokens').delete().eq('profile_id', profileId);
    } else {
      console.error('Gửi push thất bại:', err.message);
    }
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload: WebhookPayload = await request.json();
  const supabase = getServiceClient();

  if (payload.table === 'sos_responses' && payload.type === 'INSERT') {
    // Có spare mới được nhờ (broadcast hoặc direct) — báo cho spare đó.
    const response = payload.record;
    const { data: session } = await supabase
      .from('sos_sessions')
      .select('mode, owner:profiles!sos_sessions_owner_id_fkey(display_name)')
      .eq('id', response.session_id)
      .single();

    const ownerName = (session as any)?.owner?.display_name ?? 'Ai đó';
    const body =
      (session as any)?.mode === 'broadcast'
        ? 'Đã nhờ tất cả lốp — ai đồng ý trước sẽ đi giúp. Bấm để xem chi tiết.'
        : 'Nhờ riêng bạn giúp lần này. Bấm để xem chi tiết.';

    await sendPush(supabase, response.spare_id, `🆘 ${ownerName} đang cần giúp!`, body, {
      url: `/sos/incoming/${response.session_id}`,
    });
  }

  if (payload.table === 'sos_responses' && payload.type === 'UPDATE') {
    // Spare vừa đồng ý/từ chối — báo cho owner.
    const response = payload.record;
    const oldResponse = payload.old_record;
    if (oldResponse?.status !== 'pending' || response.status === 'pending') {
      return NextResponse.json({ ok: true });
    }

    const { data: session } = await supabase
      .from('sos_sessions')
      .select('owner_id, mode')
      .eq('id', response.session_id)
      .single();

    if (!session) return NextResponse.json({ ok: true });

    const { data: spare } = await supabase.from('profiles').select('display_name').eq('id', response.spare_id).single();
    const spareName = spare?.display_name ?? 'Ai đó';

    if (response.status === 'accepted') {
      await sendPush(supabase, session.owner_id, `🟢 ${spareName} đã đồng ý giúp!`, 'Vị trí của bạn đang được chia sẻ. Bấm để xem chi tiết.', {
        url: `/sos/${response.session_id}`,
      });
    } else if (response.status === 'declined') {
      const body = session.mode === 'direct' ? 'Phiên cầu cứu đã kết thúc — hãy tạo yêu cầu mới nếu cần.' : 'Vẫn còn người khác chưa trả lời.';
      await sendPush(supabase, session.owner_id, `${spareName} đã từ chối`, body, { url: `/sos/${response.session_id}` });
    }
  }

  return NextResponse.json({ ok: true });
}

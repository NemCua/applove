'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { CircleCheck, Plus, Trophy, TriangleAlert, UserRound } from 'lucide-react';
import { SosButton } from '../components/SosButton';
import { SpareListItem } from '../components/SpareListItem';
import { listMySpares, listOwnersOfMe, removeSpareRelationship, type MySpare, type OwnerOfMe } from '../lib/api/spares';
import { createClient } from '../lib/supabase/client';
import { getMyActiveSosSession, listIncomingSosRequests, type SosSession } from '../lib/api/sos';
import { registerPushSubscription } from '../lib/push-client';

type IncomingRequest = Awaited<ReturnType<typeof listIncomingSosRequests>>[number];

function formatRelativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [mySpares, setMySpares] = useState<MySpare[]>([]);
  const [ownersOfMe, setOwnersOfMe] = useState<OwnerOfMe[]>([]);
  const [activeSession, setActiveSession] = useState<SosSession | null>(null);
  const [incoming, setIncoming] = useState<IncomingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [spares, owners, active, incomingRequests] = await Promise.all([
        listMySpares(),
        listOwnersOfMe(),
        getMyActiveSosSession(),
        listIncomingSosRequests(),
      ]);
      setMySpares(spares);
      setOwnersOfMe(owners);
      setActiveSession(active);
      setIncoming(incomingRequests);
    } catch (err: any) {
      alert('Lỗi tải dữ liệu: ' + (err.message ?? String(err)));
    }
  }, []);

  // Phụ thuộc vào pathname (không phải []) vì router.replace('/') từ màn hình
  // khác (vd sau khi kết thúc phiên ở /sos/[sessionId]) không unmount lại
  // component Home Page trong Next.js App Router — nếu chỉ chạy 1 lần lúc mount
  // thì mỗi lần quay lại "/" sẽ hiện dữ liệu cũ (vd banner "đã có người nhận
  // giúp" dù phiên đã kết thúc).
  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [load, pathname]);

  // Bổ sung: fetch lại khi quay lại app/tab sau khi rời đi hẳn (không qua
  // router điều hướng nội bộ) — vd khoá màn hình rồi mở lại.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  useEffect(() => {
    registerPushSubscription().catch(() => {});
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const existing = supabase.getChannels().find((c) => c.topic === 'realtime:sos-home');
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel('sos-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_responses' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_sessions' }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const handleRemoveSpare = async (relationshipId: string, name: string) => {
    if (!confirm(`Xoá ${name} khỏi danh sách lốp của bạn?`)) return;
    try {
      await removeSpareRelationship(relationshipId);
      await load();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message ?? String(err)));
    }
  };

  const handleLeaveOwner = async (relationshipId: string, name: string) => {
    if (!confirm(`Bạn sẽ không còn là lốp của ${name} nữa?`)) return;
    try {
      await removeSpareRelationship(relationshipId);
      await load();
    } catch (err: any) {
      alert('Lỗi: ' + (err.message ?? String(err)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-text-dim">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg p-5 pb-12">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[20px] font-semibold tracking-tight text-text">Lốp Dự Phòng</h1>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-[13px] font-medium text-text-dim transition-colors hover:text-text"
        >
          <UserRound size={16} strokeWidth={2} />
          Hồ sơ
        </Link>
      </div>

      {activeSession && (
        <button
          onClick={() => router.push(`/sos/${activeSession.id}`)}
          className="mb-3 flex w-full items-start gap-3 rounded-xl bg-calm-dim p-4 text-left"
        >
          <div className="mt-0.5 shrink-0 text-calm">
            {activeSession.status === 'accepted' ? (
              <CircleCheck size={18} strokeWidth={2} />
            ) : (
              <TriangleAlert size={18} strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14.5px] font-medium text-text">
              {activeSession.status === 'accepted' ? 'Đã có người nhận giúp bạn' : 'Đang chờ phản hồi cầu cứu'}
            </p>
            <p className="mt-0.5 text-[12.5px] text-text-dim">Bấm để xem chi tiết</p>
          </div>
        </button>
      )}

      {incoming.map((req) => (
        <button
          key={req.response.id}
          onClick={() => router.push(`/sos/incoming/${req.session.id}`)}
          className="mb-3 flex w-full items-start gap-3 rounded-xl bg-accent-dim p-4 text-left"
        >
          <div className="mt-0.5 shrink-0 text-accent">
            <TriangleAlert size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[14.5px] font-medium text-text">{req.owner.display_name} đang cần giúp</p>
            <p className="mt-0.5 text-[12.5px] text-text-dim">Bấm để xem và phản hồi</p>
          </div>
        </button>
      ))}

      <SosButton onPress={() => router.push('/sos/new')} />

      <div className="mt-6 mb-2.5 flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-text-faint uppercase">Lốp dự phòng của bạn · {mySpares.length}</p>
        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="flex items-center gap-1 text-[13px] font-medium text-calm">
            <Trophy size={14} strokeWidth={2.25} />
            Xếp hạng
          </Link>
          <Link href="/add-spare" className="flex items-center gap-1 text-[13px] font-medium text-calm">
            <Plus size={14} strokeWidth={2.25} />
            Thêm lốp
          </Link>
        </div>
      </div>

      {mySpares.length === 0 ? (
        <p className="text-[13.5px] text-text-dim">Chưa có lốp nào — bấm &quot;Thêm lốp&quot; để bắt đầu.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {mySpares.map((item) => (
            <SpareListItem
              key={item.relationshipId}
              personId={item.spare.id}
              displayName={item.spare.display_name}
              subtitle={`Đã thêm ${formatRelativeDate(item.createdAt)}`}
              score={item.score}
              onRemove={() => handleRemoveSpare(item.relationshipId, item.spare.display_name)}
            />
          ))}
        </div>
      )}

      <p className="mt-7 mb-2.5 text-xs font-medium tracking-wide text-text-faint uppercase">
        Bạn là lốp của · {ownersOfMe.length}
      </p>

      {ownersOfMe.length === 0 ? (
        <p className="text-[13.5px] text-text-dim">Chưa là lốp của ai.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ownersOfMe.map((item) => (
            <SpareListItem
              key={item.relationshipId}
              personId={item.owner.id}
              displayName={item.owner.display_name}
              subtitle={`Từ ${formatRelativeDate(item.createdAt)}`}
              onRemove={() => handleLeaveOwner(item.relationshipId, item.owner.display_name)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

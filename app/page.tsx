'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[22px] font-extrabold text-text">Lốp Dự Phòng</h1>
        <Link href="/settings" className="text-[13px] font-semibold text-calm">
          Hồ sơ
        </Link>
      </div>

      {activeSession && (
        <button
          onClick={() => router.push(`/sos/${activeSession.id}`)}
          className="mb-3.5 w-full rounded-2xl bg-calm-dim p-4 text-left"
        >
          <p className="text-[15px] font-extrabold text-text">
            {activeSession.status === 'accepted' ? '🟢 Đã có người nhận giúp bạn' : '🆘 Đang chờ phản hồi cầu cứu'}
          </p>
          <p className="mt-1 text-[12.5px] text-text-dim">Bấm để xem chi tiết</p>
        </button>
      )}

      {incoming.map((req) => (
        <button
          key={req.response.id}
          onClick={() => router.push(`/sos/incoming/${req.session.id}`)}
          className="mb-3.5 w-full rounded-2xl bg-accent-dim p-4 text-left"
        >
          <p className="text-[15px] font-extrabold text-text">🆘 {req.owner.display_name} đang cần giúp!</p>
          <p className="mt-1 text-[12.5px] text-text-dim">Bấm để xem và phản hồi</p>
        </button>
      ))}

      <SosButton onPress={() => router.push('/sos/new')} />

      <div className="mt-[22px] mb-2.5 flex items-center justify-between">
        <p className="text-xs font-bold tracking-wide text-text-faint uppercase">Lốp dự phòng của bạn · {mySpares.length}</p>
        <Link href="/add-spare" className="text-[13px] font-bold text-calm">
          + Thêm lốp
        </Link>
      </div>

      {mySpares.length === 0 ? (
        <p className="text-[13.5px] text-text-dim">Chưa có lốp nào — bấm &quot;Thêm lốp&quot; để bắt đầu.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {mySpares.map((item) => (
            <SpareListItem
              key={item.relationshipId}
              personId={item.spare.id}
              displayName={item.spare.display_name}
              subtitle={`Đã thêm ${formatRelativeDate(item.createdAt)}`}
              onRemove={() => handleRemoveSpare(item.relationshipId, item.spare.display_name)}
            />
          ))}
        </div>
      )}

      <p className="mt-6 mb-2.5 text-xs font-bold tracking-wide text-text-faint uppercase">
        Bạn là lốp của · {ownersOfMe.length}
      </p>

      {ownersOfMe.length === 0 ? (
        <p className="text-[13.5px] text-text-dim">Chưa là lốp của ai.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
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

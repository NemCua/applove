'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getSosLocation, getSosSession, respondToSos, type SosLocation, type SosSession } from '../../../../lib/api/sos';
import { createClient } from '../../../../lib/supabase/client';

const OwnerLocationMap = dynamic(() => import('../../../../components/OwnerLocationMap').then((m) => m.OwnerLocationMap), {
  ssr: false,
});

export default function IncomingSosPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SosSession | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [myStatus, setMyStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [location, setLocation] = useState<SosLocation | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const supabase = createClient();
    const s = await getSosSession(sessionId);
    setSession(s);
    if (s) {
      const { data: owner } = await supabase.from('profiles').select('display_name').eq('id', s.ownerId).single();
      setOwnerName(owner?.display_name ?? '');

      const { data: userData } = await supabase.auth.getUser();
      const { data: myResponse } = await supabase
        .from('sos_responses')
        .select('status')
        .eq('session_id', sessionId)
        .eq('spare_id', userData.user?.id ?? '')
        .maybeSingle();
      setMyStatus((myResponse?.status as any) ?? 'pending');
    }
  }, [sessionId]);

  useEffect(() => {
    setIsLoading(true);
    load()
      .catch((err: any) => alert('Lỗi tải phiên cầu cứu: ' + (err.message ?? String(err))))
      .finally(() => setIsLoading(false));
  }, [load]);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    const topic = `realtime:sos-incoming-${sessionId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`sos-incoming-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_sessions', filter: `id=eq.${sessionId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, load]);

  // Chỉ subscribe vị trí owner khi mình đúng là người đã được nhận giúp — RLS
  // cũng chặn ở tầng DB, nhưng tự giới hạn ở đây tránh gọi thừa realtime channel.
  useEffect(() => {
    if (!sessionId || myStatus !== 'accepted') return;
    const supabase = createClient();

    getSosLocation(sessionId).then(setLocation).catch(() => {});

    const topic = `realtime:sos-location-${sessionId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`sos-location-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_locations', filter: `session_id=eq.${sessionId}` },
        () => {
          getSosLocation(sessionId).then(setLocation).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, myStatus]);

  const respond = async (accept: boolean) => {
    if (!sessionId || isResponding) return;
    setIsResponding(true);
    try {
      await respondToSos(sessionId, accept);
      if (!accept) {
        router.replace('/');
      }
    } catch (err: any) {
      alert('Lỗi: ' + (err.message ?? String(err)));
      await load();
    } finally {
      setIsResponding(false);
    }
  };

  if (isLoading || !session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-text-dim">Đang tải...</p>
      </div>
    );
  }

  if (session.status === 'ended') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-xl font-extrabold text-text">Phiên đã kết thúc</h1>
        <p className="text-center text-sm text-text-dim">{ownerName} không còn cần giúp nữa.</p>
        <button
          onClick={() => router.replace('/')}
          className="mt-3 rounded-2xl border border-border bg-surface-2 px-5 py-3 text-sm font-bold text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  if (session.status === 'accepted' && session.acceptedBy && myStatus !== 'accepted') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-xl font-extrabold text-text">Đã có người nhận giúp</h1>
        <p className="text-center text-sm text-text-dim">Ai đó khác đã đồng ý giúp {ownerName} rồi.</p>
        <button
          onClick={() => router.replace('/')}
          className="mt-3 rounded-2xl border border-border bg-surface-2 px-5 py-3 text-sm font-bold text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  if (myStatus === 'declined') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-xl font-extrabold text-text">Bạn đã từ chối</h1>
        <button
          onClick={() => router.replace('/')}
          className="mt-3 rounded-2xl border border-border bg-surface-2 px-5 py-3 text-sm font-bold text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  if (myStatus === 'accepted') {
    return (
      <div className="flex h-full flex-1 flex-col p-5">
        <div className="mb-3 rounded-[20px] bg-accent-dim p-[22px]">
          <p className="mb-1.5 text-[11px] font-extrabold tracking-wide text-white/70 uppercase">Đang giúp</p>
          <h1 className="text-center text-xl font-extrabold text-text">{ownerName} cần bạn tới giúp</h1>
        </div>

        {location ? (
          <>
            <div className="mb-3 h-[50vh] min-h-[300px] flex-1 overflow-hidden rounded-2xl">
              <OwnerLocationMap latitude={location.latitude} longitude={location.longitude} ownerName={ownerName} />
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 block w-full rounded-2xl bg-calm py-3.5 text-center text-[15px] font-extrabold text-white"
            >
              Chỉ đường tới đây
            </a>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <p className="text-sm text-text-dim">Đang chờ {ownerName} chia sẻ vị trí...</p>
          </div>
        )}

        <button
          onClick={() => router.replace('/')}
          className="w-full rounded-2xl border border-border bg-surface-2 py-3 text-sm font-bold text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-3.5 p-5">
      <div className="mb-3 rounded-[20px] bg-accent-dim p-[22px]">
        <p className="mb-1.5 text-[11px] font-extrabold tracking-wide text-white/70 uppercase">Cầu cứu</p>
        <h1 className="text-center text-xl font-extrabold text-text">{ownerName} đang cần giúp!</h1>
        <p className="mt-1.5 text-center text-sm text-text-dim">
          {session.mode === 'broadcast' ? 'Đã nhờ tất cả lốp — ai đồng ý trước sẽ đi giúp.' : 'Nhờ riêng bạn giúp lần này.'}
        </p>
      </div>

      <button
        onClick={() => respond(true)}
        disabled={isResponding}
        className="rounded-2xl bg-ok py-4 text-base font-extrabold text-[#08341F] disabled:opacity-50"
      >
        Đồng ý giúp
      </button>

      <button
        onClick={() => respond(false)}
        disabled={isResponding}
        className="rounded-2xl border border-border bg-surface-2 py-4 text-[15px] font-bold text-text-dim disabled:opacity-50"
      >
        Từ chối
      </button>
    </div>
  );
}

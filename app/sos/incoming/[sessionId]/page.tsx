'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Check, CircleAlert, Navigation, TriangleAlert, X } from 'lucide-react';
import {
  listSosLocations,
  getSosSession,
  respondToSos,
  updateSosLocation,
  type SosLocation,
  type SosSession,
} from '../../../../lib/api/sos';
import { createClient } from '../../../../lib/supabase/client';
import type { MapPoint } from '../../../../components/SosMap';

const SosMap = dynamic(() => import('../../../../components/SosMap').then((m) => m.SosMap), { ssr: false });

export default function IncomingSosPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SosSession | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<'pending' | 'accepted' | 'declined'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [locations, setLocations] = useState<SosLocation[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const supabase = createClient();
    const s = await getSosSession(sessionId);
    setSession(s);
    if (s) {
      const { data: owner } = await supabase.from('profiles').select('display_name').eq('id', s.ownerId).single();
      setOwnerName(owner?.display_name ?? '');

      const { data: userData } = await supabase.auth.getUser();
      setMyId(userData.user?.id ?? null);
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

  // Chỉ subscribe vị trí khi mình đúng là người đã được nhận giúp — RLS cũng
  // chặn ở tầng DB, nhưng tự giới hạn ở đây tránh gọi thừa realtime channel.
  useEffect(() => {
    if (!sessionId || myStatus !== 'accepted') return;
    const supabase = createClient();

    listSosLocations(sessionId).then(setLocations).catch(() => {});

    const topic = `realtime:sos-locations-${sessionId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`sos-locations-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_locations', filter: `session_id=eq.${sessionId}` },
        () => {
          listSosLocations(sessionId).then(setLocations).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, myStatus]);

  // Spare đang giúp cũng gửi vị trí của mình (chiều mới) — để owner xem được
  // mình đang tới đâu rồi, tương tự cách owner đã chia sẻ vị trí từ M4.
  useEffect(() => {
    if (!sessionId || myStatus !== 'accepted') {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    if (watchId.current !== null) return;

    if (!('geolocation' in navigator)) {
      setLocationError('Trình duyệt không hỗ trợ định vị.');
      return;
    }

    setLocationError(null);
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        updateSosLocation(sessionId, position.coords.latitude, position.coords.longitude).catch((err: any) => {
          setLocationError(err.message ?? String(err));
        });
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED ? 'Cần cho phép truy cập vị trí để chia sẻ với người đang cần giúp.' : err.message
        );
      },
      { enableHighAccuracy: true, maximumAge: 4000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
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

  if (session.status === 'completed' || session.status === 'failed') {
    const isMe = myStatus === 'accepted';
    const title = !isMe
      ? 'Phiên đã kết thúc'
      : session.status === 'completed'
        ? 'Đã hoàn thành — cảm ơn bạn!'
        : session.endedBy === session.ownerId
          ? 'Chưa được đánh giá hoàn thành'
          : 'Bạn đã huỷ giúp đỡ';
    const subtitle = !isMe
      ? `${ownerName} không còn cần giúp nữa.`
      : session.status === 'completed'
        ? `${ownerName} đã xác nhận bạn giúp xong.`
        : session.endedBy === session.ownerId
          ? `${ownerName} đánh giá lần này chưa hoàn thành.`
          : 'Bạn đã tự kết thúc giữa chừng.';

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-[19px] font-semibold tracking-tight text-text">{title}</h1>
        <p className="text-center text-sm text-text-dim">{subtitle}</p>
        <button
          onClick={() => router.replace('/')}
          className="mt-3 rounded-xl border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  if (session.status === 'accepted' && session.acceptedBy && myStatus !== 'accepted') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-[19px] font-semibold tracking-tight text-text">Đã có người nhận giúp</h1>
        <p className="text-center text-sm text-text-dim">Ai đó khác đã đồng ý giúp {ownerName} rồi.</p>
        <button
          onClick={() => router.replace('/')}
          className="mt-3 rounded-xl border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  if (myStatus === 'declined') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
        <h1 className="text-[19px] font-semibold tracking-tight text-text">Bạn đã từ chối</h1>
        <button
          onClick={() => router.replace('/')}
          className="mt-3 rounded-xl border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  if (myStatus === 'accepted') {
    const ownerLocation = locations.find((l) => l.profileId === session.ownerId);
    const myLocation = locations.find((l) => l.profileId === myId);

    const mapPoints: MapPoint[] = [];
    if (ownerLocation) mapPoints.push({ latitude: ownerLocation.latitude, longitude: ownerLocation.longitude, label: ownerName, color: 'accent' });
    if (myLocation) mapPoints.push({ latitude: myLocation.latitude, longitude: myLocation.longitude, label: 'Vị trí của bạn', color: 'calm' });

    return (
      <div className="flex h-full flex-1 flex-col p-5">
        <div className="mb-3 rounded-2xl bg-accent-dim p-5">
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-white/65 uppercase">Đang giúp</p>
          <h1 className="text-center text-lg font-semibold tracking-tight text-text">{ownerName} cần bạn tới giúp</h1>
          {locationError && (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[12.5px] text-danger">
              <CircleAlert size={13} strokeWidth={2} />
              {locationError}
            </div>
          )}
        </div>

        {ownerLocation ? (
          <>
            <div className="mb-3 h-[50vh] min-h-[300px] flex-1 overflow-hidden rounded-2xl border border-border">
              <SosMap points={mapPoints} />
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${ownerLocation.latitude},${ownerLocation.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-calm py-3.5 text-[15px] font-medium text-white"
            >
              <Navigation size={17} strokeWidth={2} />
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
          className="w-full rounded-xl border border-border bg-surface-2 py-3 text-sm font-medium text-text"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-3 p-5">
      <div className="mb-3 rounded-2xl bg-accent-dim p-5">
        <p className="mb-1.5 flex items-center justify-center gap-1.5 text-[11px] font-medium tracking-wide text-white/65 uppercase">
          <TriangleAlert size={13} strokeWidth={2} />
          Cầu cứu
        </p>
        <h1 className="text-center text-lg font-semibold tracking-tight text-text">{ownerName} đang cần giúp</h1>
        <p className="mt-1.5 text-center text-sm text-text-dim">
          {session.mode === 'broadcast' ? 'Đã nhờ tất cả lốp — ai đồng ý trước sẽ đi giúp.' : 'Nhờ riêng bạn giúp lần này.'}
        </p>
      </div>

      <button
        onClick={() => respond(true)}
        disabled={isResponding}
        className="flex items-center justify-center gap-2 rounded-2xl bg-ok py-4 text-[15px] font-medium text-[#132B0A] transition-opacity active:opacity-90 disabled:opacity-50"
      >
        <Check size={18} strokeWidth={2.25} />
        Đồng ý giúp
      </button>

      <button
        onClick={() => respond(false)}
        disabled={isResponding}
        className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface-2 py-4 text-[15px] font-medium text-text-dim transition-colors active:bg-surface disabled:opacity-50"
      >
        <X size={18} strokeWidth={2} />
        Từ chối
      </button>
    </div>
  );
}

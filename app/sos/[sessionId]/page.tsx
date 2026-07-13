'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  endSosSession,
  getSosSession,
  listSosResponses,
  updateSosLocation,
  type SosResponse,
  type SosSession,
} from '../../../lib/api/sos';
import { createClient } from '../../../lib/supabase/client';

const STATUS_LABEL: Record<SosSession['status'], string> = {
  active: 'Đang chờ phản hồi...',
  accepted: 'Đã có người nhận giúp!',
  ended: 'Phiên đã kết thúc',
};

const RESPONSE_LABEL: Record<SosResponse['status'], string> = {
  pending: 'Chưa trả lời',
  accepted: 'Đồng ý giúp',
  declined: 'Đã từ chối',
};

export default function ActiveSosPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SosSession | null>(null);
  const [responses, setResponses] = useState<SosResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const [s, r] = await Promise.all([getSosSession(sessionId), listSosResponses(sessionId)]);
    setSession(s);
    setResponses(r);
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
    const topic = `realtime:sos-owner-${sessionId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(`sos-owner-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_sessions', filter: `id=eq.${sessionId}` },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sos_responses', filter: `session_id=eq.${sessionId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, load]);

  // Chỉ chia sẻ vị trí khi đã có người đồng ý giúp (CONTEXT.md §4.3) — chưa ai
  // nhận thì chưa cần bật GPS, đỡ hao pin. Tự dừng khi phiên kết thúc hoặc
  // component unmount.
  useEffect(() => {
    if (!sessionId || !session || session.status !== 'accepted') {
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
          err.code === err.PERMISSION_DENIED
            ? 'Cần cho phép truy cập vị trí để chia sẻ với người đang giúp bạn.'
            : err.message
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
  }, [sessionId, session?.status]);

  const handleEnd = async () => {
    if (!sessionId) return;
    if (!confirm('Bạn đã ổn rồi? Phiên cầu cứu sẽ kết thúc.')) return;
    setIsEnding(true);
    try {
      await endSosSession(sessionId);
      router.replace('/');
    } catch (err: any) {
      alert('Lỗi: ' + (err.message ?? String(err)));
    } finally {
      setIsEnding(false);
    }
  };

  if (isLoading || !session) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-text-dim">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg p-5 pb-12">
      <h1 className="mb-3.5 text-[22px] font-extrabold text-text">Đang cầu cứu</h1>

      <div className={`mb-5 rounded-2xl p-[18px] ${session.status === 'accepted' ? 'bg-calm-dim' : 'bg-accent-dim'}`}>
        <p className="text-base font-extrabold text-text">{STATUS_LABEL[session.status]}</p>
        {session.mode === 'broadcast' && (
          <p className="mt-1 text-[13px] text-text-dim">Đã nhờ tất cả lốp — {responses.length} người</p>
        )}
        {session.status === 'accepted' && !locationError && (
          <p className="mt-1 text-[13px] text-text-dim">📍 Đang chia sẻ vị trí của bạn cho người giúp</p>
        )}
        {session.status === 'accepted' && locationError && <p className="mt-1 text-[13px] text-danger">⚠️ {locationError}</p>}
      </div>

      {responses.length > 0 && (
        <>
          <p className="mb-2.5 text-xs font-bold tracking-wide text-text-faint uppercase">Phản hồi</p>
          <div className="flex flex-col gap-2.5">
            {responses.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 p-3">
                <p className="text-[14.5px] font-bold text-text">{item.spare.display_name}</p>
                <p
                  className={`text-[12.5px] font-semibold ${
                    item.status === 'accepted' ? 'text-ok' : item.status === 'declined' ? 'text-danger' : 'text-text-dim'
                  }`}
                >
                  {RESPONSE_LABEL[item.status]}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {session.status !== 'ended' ? (
        <button
          onClick={handleEnd}
          disabled={isEnding}
          className="mt-5 w-full rounded-2xl border border-border bg-surface-2 py-3.5 text-[14.5px] font-bold text-text disabled:opacity-50"
        >
          {isEnding ? 'Đang xử lý...' : 'Kết thúc phiên (đã ổn)'}
        </button>
      ) : (
        <button
          onClick={() => router.replace('/')}
          className="mt-5 w-full rounded-2xl border border-border bg-surface-2 py-3.5 text-[14.5px] font-bold text-text"
        >
          Về trang chủ
        </button>
      )}
    </div>
  );
}

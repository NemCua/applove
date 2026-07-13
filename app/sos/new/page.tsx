'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listMySpares, type MySpare } from '../../../lib/api/spares';
import { createSosSession } from '../../../lib/api/sos';

export default function NewSosPage() {
  const router = useRouter();
  const [spares, setSpares] = useState<MySpare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    listMySpares()
      .then(setSpares)
      .catch((err: any) => alert('Lỗi tải danh sách lốp: ' + (err.message ?? String(err))))
      .finally(() => setIsLoading(false));
  }, []);

  const start = async (mode: 'broadcast' | 'direct', targetSpareId?: string) => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const sessionId = await createSosSession(mode, targetSpareId);
      router.replace(`/sos/${sessionId}`);
    } catch (err: any) {
      alert('Không tạo được phiên cầu cứu: ' + (err.message ?? String(err)));
    } finally {
      setIsCreating(false);
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
      <h1 className="mb-1 text-[22px] font-extrabold text-text">Cầu cứu</h1>
      <p className="mb-[18px] text-sm text-text-dim">Chọn nhờ tất cả lốp, hoặc nhờ riêng 1 người bên dưới.</p>

      <button
        onClick={() => start('broadcast')}
        disabled={isCreating || spares.length === 0}
        className="mb-[22px] w-full rounded-2xl bg-accent py-4 text-base font-extrabold text-white disabled:opacity-50"
      >
        🆘 Nhờ tất cả lốp ({spares.length})
      </button>

      {spares.length === 0 && (
        <p className="mb-3 text-[13.5px] text-text-dim">Bạn chưa có lốp nào — thêm lốp trước khi cầu cứu.</p>
      )}

      {spares.length > 0 && (
        <p className="mb-2.5 text-xs font-bold tracking-wide text-text-faint uppercase">Hoặc nhờ riêng 1 người</p>
      )}

      <div className="flex flex-col gap-2.5">
        {spares.map((item) => (
          <button
            key={item.relationshipId}
            onClick={() => start('direct', item.spare.id)}
            disabled={isCreating}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3 text-left disabled:opacity-50"
          >
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-calm text-sm font-bold text-white">
              {item.spare.display_name.trim().charAt(0).toUpperCase() || '?'}
            </div>
            <p className="text-[14.5px] font-bold text-text">{item.spare.display_name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TriangleAlert, Users } from 'lucide-react';
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
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-text-dim transition-colors hover:text-text"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Quay lại
      </button>

      <h1 className="mb-1 text-[20px] font-semibold tracking-tight text-text">Cầu cứu</h1>
      <p className="mb-5 text-sm text-text-dim">Chọn nhờ tất cả lốp, hoặc nhờ riêng 1 người bên dưới.</p>

      <button
        onClick={() => start('broadcast')}
        disabled={isCreating || spares.length === 0}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-[15px] font-medium text-white transition-opacity active:opacity-90 disabled:opacity-50"
      >
        <Users size={18} strokeWidth={2} />
        Nhờ tất cả lốp ({spares.length})
      </button>

      {spares.length === 0 && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-border bg-surface-2 p-3.5">
          <TriangleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-text-faint" />
          <p className="text-[13.5px] text-text-dim">Bạn chưa có lốp nào — thêm lốp trước khi cầu cứu.</p>
        </div>
      )}

      {spares.length > 0 && (
        <p className="mb-2.5 text-xs font-medium tracking-wide text-text-faint uppercase">Hoặc nhờ riêng 1 người</p>
      )}

      <div className="flex flex-col gap-2">
        {spares.map((item) => (
          <button
            key={item.relationshipId}
            onClick={() => start('direct', item.spare.id)}
            disabled={isCreating}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left transition-colors active:bg-surface disabled:opacity-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-calm text-sm font-medium text-white">
              {item.spare.display_name.trim().charAt(0).toUpperCase() || '?'}
            </div>
            <p className="text-[14.5px] font-medium text-text">{item.spare.display_name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

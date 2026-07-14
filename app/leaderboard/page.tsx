'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react';
import { listMySpares, type MySpare } from '../../lib/api/spares';
import { avatarColorFor } from '../../components/SpareListItem';

const PODIUM_STYLE: Record<number, { height: string; badge: string; icon: typeof Crown; ring: string }> = {
  0: { height: 'h-28', badge: 'bg-[#E8C468]', icon: Crown, ring: 'ring-[#E8C468]' },
  1: { height: 'h-20', badge: 'bg-[#B8B8B8]', icon: Medal, ring: 'ring-[#B8B8B8]' },
  2: { height: 'h-14', badge: 'bg-[#C98A5C]', icon: Medal, ring: 'ring-[#C98A5C]' },
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [spares, setSpares] = useState<MySpare[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    listMySpares()
      .then((data) => setSpares([...data].sort((a, b) => b.score - a.score)))
      .catch((err: any) => alert('Lỗi tải bảng xếp hạng: ' + (err.message ?? String(err))))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-text-dim">Đang tải...</p>
      </div>
    );
  }

  const top3 = spares.slice(0, 3);
  const rest = spares.slice(3);
  // Thứ tự hiển thị trên bục: hạng 2 - hạng 1 - hạng 3 (hạng 1 ở giữa, cao nhất)
  const podiumOrder = [top3[1], top3[0], top3[2]];

  return (
    <div className="mx-auto w-full max-w-lg p-5 pb-12">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-text-dim transition-colors hover:text-text"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Quay lại
      </button>

      <div className="mb-7 flex items-center gap-2">
        <Trophy size={20} strokeWidth={2} className="text-accent" />
        <h1 className="text-[20px] font-semibold tracking-tight text-text">Bảng xếp hạng lốp</h1>
      </div>

      {spares.length === 0 ? (
        <p className="text-[13.5px] text-text-dim">Chưa có lốp nào để xếp hạng — thêm lốp và bắt đầu cầu cứu để tích điểm.</p>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="mb-8 flex items-end justify-center gap-3">
              {podiumOrder.map((item, i) => {
                if (!item) return <div key={i} className="w-24" />;
                const rank = i === 1 ? 0 : i === 0 ? 1 : 2;
                const style = PODIUM_STYLE[rank];
                const Icon = style.icon;
                const initial = item.spare.display_name.trim().charAt(0).toUpperCase() || '?';

                return (
                  <div key={item.relationshipId} className="flex w-24 flex-col items-center">
                    <div className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-full ${style.badge}`}>
                      <Icon size={13} strokeWidth={2.25} className="text-[#141310]" />
                    </div>
                    <div
                      className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white ring-2 ${style.ring} ring-offset-2 ring-offset-bg`}
                      style={{ backgroundColor: avatarColorFor(item.spare.id) }}
                    >
                      {initial}
                    </div>
                    <p className="w-full truncate text-center text-[13px] font-medium text-text">{item.spare.display_name}</p>
                    <p className="mb-2 text-[12px] font-semibold tabular-nums text-accent">{item.score}đ</p>
                    <div className={`flex w-full items-start justify-center rounded-t-lg bg-surface-2 pt-2 ${style.height}`}>
                      <p className="text-lg font-semibold tabular-nums text-text-faint">{rank + 1}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rest.length > 0 && (
            <div className="flex flex-col gap-2">
              {rest.map((item, i) => {
                const rank = i + 4;
                const initial = item.spare.display_name.trim().charAt(0).toUpperCase() || '?';
                return (
                  <div key={item.relationshipId} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                    <p className="w-5 shrink-0 text-center text-[13px] font-semibold tabular-nums text-text-faint">{rank}</p>
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: avatarColorFor(item.spare.id) }}
                    >
                      {initial}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-text">{item.spare.display_name}</p>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-accent">{item.score}đ</p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

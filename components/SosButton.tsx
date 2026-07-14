'use client';

import { TriangleAlert } from 'lucide-react';

export function SosButton({ onPress }: { onPress: () => void }) {
  return (
    <div className="rounded-2xl bg-accent p-5">
      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-white/75 uppercase">Khẩn cấp</p>
      <p className="mb-4 text-[19px] leading-6 font-semibold text-white">Xe hỏng, hết xăng, bể bánh?</p>
      <button
        onClick={onPress}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-[15px] font-semibold text-[#A8452C] transition-opacity active:opacity-80"
      >
        <TriangleAlert size={18} strokeWidth={2} />
        Cầu cứu ngay
      </button>
    </div>
  );
}

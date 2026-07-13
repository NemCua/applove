'use client';

export function SosButton({ onPress }: { onPress: () => void }) {
  return (
    <div className="rounded-[20px] bg-accent p-5">
      <p className="mb-1.5 text-[11px] font-extrabold tracking-wide text-white/85 uppercase">Khẩn cấp</p>
      <p className="mb-3.5 text-[19px] leading-6 font-extrabold text-white">Xe hỏng, hết xăng, bể bánh?</p>
      <button onClick={onPress} className="w-full rounded-[14px] bg-white py-3.5 text-[15px] font-extrabold text-[#C4441C]">
        🆘 Cầu cứu ngay
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInviteCode, redeemInviteCode } from '../../lib/api/invites';

export default function AddSparePage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setIsRedeeming(true);
    try {
      const result = await redeemInviteCode(code);
      alert(`Thành công! Bạn đã trở thành lốp dự phòng của ${result.ownerDisplayName}.`);
      router.back();
    } catch (err: any) {
      alert('Không nhập được mã: ' + (err.message ?? String(err)));
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { code: newCode } = await createInviteCode();
      setGeneratedCode(newCode);
    } catch (err: any) {
      alert('Lỗi tạo mã mời: ' + (err.message ?? String(err)));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!generatedCode) return;
    const message = `Thêm mình làm lốp dự phòng trên Lốp Dự Phòng nhé! Mã mời: ${generatedCode} (hết hạn sau 24h)`;
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
      } catch {
        // người dùng huỷ share dialog — không phải lỗi
      }
    } else {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg p-6 pt-8">
      <h1 className="mb-6 text-[22px] font-extrabold text-text">Thêm lốp</h1>

      <div className="flex flex-col gap-2.5">
        <p className="text-[14.5px] font-bold text-text">Nhập mã mời của người khác</p>
        <p className="mb-1 text-[12.5px] text-text-dim">Bạn sẽ trở thành lốp dự phòng của người tạo mã.</p>
        <input
          type="text"
          placeholder="Nhập mã mời"
          autoCapitalize="none"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-[15px] tracking-wide text-text placeholder:text-text-faint"
        />
        <button
          onClick={handleRedeem}
          disabled={isRedeeming || !code.trim()}
          className="rounded-xl bg-accent py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60"
        >
          {isRedeeming ? 'Đang xử lý...' : 'Xác nhận'}
        </button>
      </div>

      <div className="my-7 h-px bg-border" />

      <div className="flex flex-col gap-2.5">
        <p className="text-[14.5px] font-bold text-text">Mời người khác làm lốp của bạn</p>
        <p className="mb-1 text-[12.5px] text-text-dim">Tạo mã dùng 1 lần, hết hạn sau 24 giờ, rồi gửi cho bạn bè.</p>

        {generatedCode ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-calm bg-surface-2 p-5">
            <p className="text-[28px] font-extrabold tracking-[4px] text-calm">{generatedCode}</p>
            <button onClick={handleShare} className="rounded-[10px] bg-calm px-5 py-2.5 text-[13.5px] font-bold text-white">
              {copied ? 'Đã sao chép!' : 'Chia sẻ mã'}
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="rounded-xl border-[1.5px] border-border py-3.5 text-[14.5px] font-bold text-text disabled:opacity-60"
          >
            {isGenerating ? 'Đang tạo...' : 'Tạo mã mời mới'}
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Nhập đầy đủ email và mật khẩu.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (signInError) {
      setError('Đăng nhập thất bại: ' + signInError);
      return;
    }
    router.replace('/');
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <h1 className="mb-1.5 text-2xl font-semibold tracking-tight text-text">Lốp Dự Phòng</h1>
      <p className="mb-8 text-sm text-text-dim">Đăng nhập để tiếp tục</p>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <div className="relative">
          <Mail size={17} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-faint" />
          <input
            type="email"
            placeholder="Email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 py-3.5 pr-4 pl-10 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>
        <div className="relative">
          <Lock size={17} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-faint" />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 py-3.5 pr-4 pl-10 text-[15px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-[13px] text-danger">
            <CircleAlert size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 rounded-xl bg-accent py-3.5 text-[15px] font-medium text-white transition-opacity active:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <Link href="/signup" className="mt-2 text-center text-[13px] text-text-dim">
          Chưa có tài khoản? <span className="font-medium text-calm">Đăng ký</span>
        </Link>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password) {
      setError('Nhập đầy đủ tên hiển thị, email và mật khẩu.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const { error: signUpError } = await signUp(email.trim(), password, displayName.trim());
    setIsSubmitting(false);
    if (signUpError) {
      setError('Đăng ký thất bại: ' + signUpError);
      return;
    }
    router.replace('/');
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <h1 className="mb-1.5 text-3xl font-extrabold text-text">Tạo tài khoản</h1>
      <p className="mb-8 text-sm text-text-dim">Tham gia nhóm bạn bè của bạn</p>

      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input
          type="text"
          placeholder="Tên hiển thị"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint"
        />
        <input
          type="email"
          placeholder="Email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint"
        />
        <input
          type="password"
          placeholder="Mật khẩu (tối thiểu 6 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-[15px] text-text placeholder:text-text-faint"
        />

        {error && <p className="text-[13px] text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 rounded-xl bg-accent py-3.5 text-[15px] font-extrabold text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>

        <Link href="/login" className="mt-2 text-center text-[13px] text-calm">
          Đã có tài khoản? Đăng nhập
        </Link>
      </form>
    </div>
  );
}

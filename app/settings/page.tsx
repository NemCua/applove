'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function SettingsPage() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const email = session?.user.email ?? '';
  const initial = email.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="mx-auto w-full max-w-lg p-5 pb-12">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-text-dim transition-colors hover:text-text"
      >
        <ArrowLeft size={16} strokeWidth={2} />
        Quay lại
      </button>

      <div className="flex flex-col items-center gap-4 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-calm text-2xl font-medium text-white">
          {initial}
        </div>
        <div className="text-center">
          <p className="text-[15px] font-medium text-text">{email}</p>
        </div>
      </div>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 py-3.5 text-[14.5px] font-medium text-danger transition-colors active:bg-surface"
      >
        <LogOut size={16} strokeWidth={2} />
        Đăng xuất
      </button>
    </div>
  );
}

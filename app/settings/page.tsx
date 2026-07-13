'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';

export default function SettingsPage() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-[22px] font-extrabold text-text">Hồ sơ</h1>
      <p className="text-center text-sm text-text-dim">{session?.user.email}</p>
      <button
        onClick={handleSignOut}
        className="mt-3 rounded-xl border border-border bg-surface-2 px-6 py-3 text-sm font-bold text-danger"
      >
        Đăng xuất
      </button>
    </div>
  );
}

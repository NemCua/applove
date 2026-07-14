'use client';

import { X } from 'lucide-react';

const AVATAR_COLORS = ['#8CA3D9', '#C98CA8', '#A691C9', '#87B06A', '#D97757'];

function avatarColorFor(id: string) {
  const sum = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

type Props = {
  displayName: string;
  subtitle: string;
  personId: string;
  onRemove?: () => void;
};

export function SpareListItem({ displayName, subtitle, personId, onRemove }: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: avatarColorFor(personId) }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium text-text">{displayName}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-text-dim">{subtitle}</p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Xoá"
          className="rounded-full p-1.5 text-text-faint transition-colors hover:bg-surface hover:text-danger"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

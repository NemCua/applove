'use client';

const AVATAR_COLORS = ['#4C8DFF', '#E85A9C', '#8A5FE8', '#3DD68C', '#FF6B35'];

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
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-3">
      <div
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: avatarColorFor(personId) }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-bold text-text">{displayName}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-text-dim">{subtitle}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="px-2 py-1 text-[12.5px] font-semibold text-danger">
          Xoá
        </button>
      )}
    </div>
  );
}

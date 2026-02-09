'use client';

import { ReactNode } from 'react';

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null;
  return (
    <div className="ui-sheet-backdrop" onClick={onClose}>
      <div className="ui-bottom-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-semibold text-white/80">{title}</div>
          <button type="button" className="ui-button-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
        <div className="mt-3 ui-sheet-content">{children}</div>
      </div>
    </div>
  );
}


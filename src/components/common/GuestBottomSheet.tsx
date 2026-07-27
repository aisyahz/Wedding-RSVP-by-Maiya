import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface GuestBottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
}

export const GuestBottomSheet: React.FC<GuestBottomSheetProps> = ({
  open,
  title,
  onClose,
  children,
  contentClassName = '',
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setDragOffset(0);
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab' || !sheetRef.current) return;

      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ) as HTMLElement[];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    setDragOffset(Math.max(0, event.clientY - dragStartY.current));
  };

  const handlePointerEnd = () => {
    if (dragOffset > 90) onClose();
    setDragOffset(0);
    dragStartY.current = null;
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end" role="presentation">
      <button
        type="button"
        aria-label="Tutup panel"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-300"
      />

      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ transform: `translateY(${dragOffset}px)` }}
        className="relative z-10 flex max-h-[86dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-[30px] border border-white/70 bg-[#F7F1E8]/97 text-[#211E1B] shadow-[0_-18px_55px_rgba(32,27,23,0.24)] backdrop-blur-2xl transition-transform duration-200 ease-out animate-in slide-in-from-bottom"
      >
        <div
          className="touch-none cursor-grab px-5 pb-2 pt-3 active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div className="mx-auto h-1 w-12 rounded-full bg-[#302C28]/75" />
        </div>

        <header className="flex min-w-0 items-center justify-between gap-3 border-b border-[#D9D2CA]/70 px-4 pb-3 min-[360px]:px-6">
          <h2 className="min-w-0 break-words font-serif text-2xl font-semibold leading-tight">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={`Tutup ${title}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D9D2CA] bg-white/80 text-[#1E1E1C] transition-colors hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 min-[360px]:px-6 ${contentClassName}`}>
          {children}
        </div>
      </section>
    </div>
  );
};

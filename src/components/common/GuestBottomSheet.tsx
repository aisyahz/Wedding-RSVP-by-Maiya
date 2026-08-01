import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGuestLanguage } from '../../i18n/GuestLanguageProvider';

interface GuestBottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  contentClassName?: string;
}

type SheetSnap = 'compact' | 'expanded';

interface DragSession {
  pointerId: number;
  startY: number;
  previousY: number;
  previousTime: number;
  velocity: number;
  startHeight: number;
}

const CLOSE_DISTANCE = 110;
const SNAP_DISTANCE = 64;
const CLOSE_VELOCITY = 0.7;
const SNAP_VELOCITY = 0.45;

export const GuestBottomSheet: React.FC<GuestBottomSheetProps> = ({
  open,
  title,
  onClose,
  children,
  contentClassName = '',
}) => {
  const { t } = useGuestLanguage();
  const [snap, setSnap] = useState<SheetSnap>('compact');
  const [compactHeight, setCompactHeight] = useState(0);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const [dragTranslate, setDragTranslate] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragSession | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const contentTouchRef = useRef<DragSession | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const settleAt = (nextSnap: SheetSnap) => {
    setSnap(nextSnap);
    setLiveHeight(nextSnap === 'expanded' ? expandedHeight : compactHeight);
    setDragTranslate(0);
    setIsDragging(false);
    dragRef.current = null;
  };

  useLayoutEffect(() => {
    if (!open || !sheetRef.current) return;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const nextExpandedHeight = Math.max(320, Math.floor(viewportHeight * 0.9));

    setLiveHeight(null);
    setDragTranslate(0);
    setSnap('compact');

    const frame = window.requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      const measuredCompactHeight = Math.min(
        sheetRef.current.scrollHeight,
        Math.floor(viewportHeight * 0.62),
        nextExpandedHeight,
      );
      setCompactHeight(measuredCompactHeight);
      setExpandedHeight(nextExpandedHeight);
      setLiveHeight(measuredCompactHeight);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, title]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    closeButtonRef.current?.focus();

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

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
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const beginDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || !liveHeight) return;
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
    const now = performance.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      previousY: event.clientY,
      previousTime: now,
      velocity: 0,
      startHeight: liveHeight,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.previousTime);
    drag.velocity = (event.clientY - drag.previousY) / elapsed;
    drag.previousY = event.clientY;
    drag.previousTime = now;

    const distance = event.clientY - drag.startY;
    if (distance < 0) {
      setDragTranslate(0);
      setLiveHeight(Math.min(expandedHeight, drag.startHeight - distance));
      return;
    }

    if (drag.startHeight > compactHeight + 8) {
      setLiveHeight(Math.max(compactHeight, drag.startHeight - distance));
      setDragTranslate(Math.max(0, distance - (drag.startHeight - compactHeight)));
    } else {
      setDragTranslate(distance);
    }
  };

  const finishDrag = (drag: DragSession, endY: number) => {
    const distance = endY - drag.startY;
    const startedExpanded = drag.startHeight > compactHeight + 8;

    if (!startedExpanded && (distance > CLOSE_DISTANCE || drag.velocity > CLOSE_VELOCITY)) {
      setIsDragging(false);
      dragRef.current = null;
      onCloseRef.current();
      return;
    }

    if (startedExpanded) {
      if (distance > (drag.startHeight - compactHeight) + CLOSE_DISTANCE) {
        setIsDragging(false);
        dragRef.current = null;
        onCloseRef.current();
        return;
      }
      if (distance > SNAP_DISTANCE || drag.velocity > SNAP_VELOCITY) {
        settleAt('compact');
      } else {
        settleAt('expanded');
      }
      return;
    }

    if (distance < -SNAP_DISTANCE || drag.velocity < -SNAP_VELOCITY) {
      settleAt('expanded');
    } else {
      settleAt('compact');
    }
  };

  const endDrag = (event?: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || (event && drag.pointerId !== event.pointerId)) return;
    finishDrag(drag, event?.clientY ?? drag.previousY);
  };

  const beginContentTouch = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!liveHeight || !contentRef.current || contentRef.current.scrollTop > 0) return;
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
    const touch = event.touches[0];
    const now = performance.now();
    contentTouchRef.current = {
      pointerId: -1,
      startY: touch.clientY,
      previousY: touch.clientY,
      previousTime: now,
      velocity: 0,
      startHeight: liveHeight,
    };
  };

  const moveContentTouch = (event: React.TouchEvent<HTMLDivElement>) => {
    const drag = contentTouchRef.current;
    const touch = event.touches[0];
    if (!drag || !touch || !contentRef.current || contentRef.current.scrollTop > 0) return;
    const distance = touch.clientY - drag.startY;
    if (distance <= 6) return;
    event.preventDefault();
    setIsDragging(true);
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.previousTime);
    drag.velocity = (touch.clientY - drag.previousY) / elapsed;
    drag.previousY = touch.clientY;
    drag.previousTime = now;

    if (drag.startHeight > compactHeight + 8) {
      setLiveHeight(Math.max(compactHeight, drag.startHeight - distance));
      setDragTranslate(Math.max(0, distance - (drag.startHeight - compactHeight)));
    } else {
      setDragTranslate(distance);
    }
  };

  const endContentTouch = (event: React.TouchEvent<HTMLDivElement>) => {
    const drag = contentTouchRef.current;
    if (!drag) return;
    const endY = event.changedTouches[0]?.clientY ?? drag.previousY;
    contentTouchRef.current = null;
    finishDrag(drag, endY);
  };

  const handleHeaderKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      settleAt('expanded');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (snap === 'expanded') settleAt('compact');
      else onCloseRef.current();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end overflow-hidden" role="presentation">
      <button
        type="button"
        aria-label={t('closePanel')}
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-300"
      />

      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-snap={snap}
        style={{
          height: liveHeight ? `${liveHeight}px` : undefined,
          maxHeight: 'calc(90dvh - env(safe-area-inset-top))',
          transform: `translateY(${dragTranslate}px)`,
          transition: isDragging
            ? 'none'
            : 'height 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: isDragging ? 'height, transform' : undefined,
        }}
        className="guest-glass relative z-10 flex w-full min-w-0 flex-col overflow-hidden rounded-t-[30px] pb-[env(safe-area-inset-bottom)] text-[#111]"
      >
        <div
          role="button"
          tabIndex={0}
          aria-label={snap === 'expanded' ? t('expandedPanel') : t('compactPanel')}
          className="touch-none cursor-grab px-5 pb-2 pt-3 outline-none active:cursor-grabbing"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleHeaderKeyDown}
        >
          <div className="mx-auto h-1 w-12 rounded-full bg-black/55" />
        </div>

        <header
          className="flex min-w-0 touch-none items-center justify-between gap-3 border-b border-black/10 px-4 pb-3 min-[360px]:px-6"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <h2 className="guest-sheet-title min-w-0 break-words text-xl font-semibold uppercase leading-tight tracking-[0.04em]">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('closeNamedPanel', { title })}
            className="guest-glass-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-black transition-colors hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          ref={contentRef}
          onTouchStart={beginContentTouch}
          onTouchMove={moveContentTouch}
          onTouchEnd={endContentTouch}
          onTouchCancel={endContentTouch}
          className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-5 min-[360px]:px-6 ${contentClassName}`}
        >
          {children}
        </div>
      </section>
    </div>
  );
};

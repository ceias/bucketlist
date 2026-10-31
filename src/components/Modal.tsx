import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/** Keep dialogs above desktop windows and keep keyboard navigation inside the open dialog. */
export function Modal({ children, label, className = 'modal-backdrop', onClose, busy = false, descriptionId }: {
  children: React.ReactNode; label: string; className?: string; onClose: () => void; busy?: boolean; descriptionId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const blocked = useRef(busy); blocked.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current!;
    const controls = () => [...node.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(el => el.getClientRects().length > 0);
    if (!node.contains(document.activeElement)) (node.querySelector<HTMLElement>('[autofocus],[data-autofocus]') || controls()[0] || node).focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); if (!blocked.current) close.current(); }
      if (event.key === 'Tab') {
        const elements = controls(); const first = elements[0]; const last = elements.at(-1);
        if (!first) { event.preventDefault(); node.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    node.addEventListener('keydown', keys);
    return () => { node.removeEventListener('keydown', keys); if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div ref={ref} className={className} role="dialog" aria-modal="true" aria-label={label} aria-describedby={descriptionId} tabIndex={-1} onPointerDown={event => event.stopPropagation()}>{children}</div>, document.querySelector('.os') || document.body);
}

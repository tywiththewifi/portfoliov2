// Minimal accessible modal: Esc / backdrop closes, focus returns to the opener.

export type Modal = { el: HTMLElement; body: HTMLElement; close: () => void };

let current: Modal | null = null;

export function openModal(o: { title: string; className?: string; onClose?: () => void; build: (body: HTMLElement, close: () => void) => void }): Modal {
  current?.close();
  const opener = document.activeElement as HTMLElement | null;
  const wrap = document.createElement('div');
  wrap.className = `modal ${o.className ?? ''}`;
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', o.title);
  wrap.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card"><button class="modal-x" data-close aria-label="Close">✕</button><div class="modal-body"></div></div>`;
  const body = wrap.querySelector('.modal-body') as HTMLElement;
  document.body.appendChild(wrap);
  document.documentElement.classList.add('modal-open');

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.classList.remove('on');
    document.removeEventListener('keydown', onKey);
    document.documentElement.classList.remove('modal-open');
    setTimeout(() => wrap.remove(), 220);
    if (current?.el === wrap) current = null;
    o.onClose?.();
    opener?.focus?.();
  };
  wrap.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-close]')) close();
  });
  document.addEventListener('keydown', onKey);
  o.build(body, close);
  requestAnimationFrame(() => {
    wrap.classList.add('on');
    (wrap.querySelector('[data-autofocus]') as HTMLElement | null ?? wrap.querySelector('.modal-x') as HTMLElement).focus();
  });
  current = { el: wrap, body, close };
  return current;
}

export function closeModal() {
  current?.close();
}

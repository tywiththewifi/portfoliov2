// The screen recordings in the case studies: silent loops that play while
// they're on screen and pause when they scroll away, so only the ones in view
// are decoding. Nothing downloads until a clip first comes into view (they're
// preload="none" and show their poster till then). Each has a play/pause
// button; with reduced motion they start paused and the button plays them.
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/></svg>';

export function mountClips() {
  const clips = [...document.querySelectorAll<HTMLVideoElement>('video[data-clip]')];
  if (!clips.length) return;
  const held = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = new Map<HTMLVideoElement, { seen: boolean; held: boolean }>();
  const sync = (v: HTMLVideoElement) => {
    const s = state.get(v)!;
    if (s.seen && !s.held) v.play().catch(() => {}); // blocked (Low Power Mode): the button shows Play
    else v.pause();
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      state.get(e.target as HTMLVideoElement)!.seen = e.isIntersecting;
      sync(e.target as HTMLVideoElement);
    }
  }, { threshold: 0.25 });

  for (const v of clips) {
    v.muted = true; // autoplay needs it set as a property too, not just the attribute
    state.set(v, { seen: false, held });

    // the button sits in the panel's corner and follows what the video is
    // actually doing
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'clip-toggle';
    const name = v.getAttribute('aria-label') ?? 'video';
    const show = () => {
      btn.innerHTML = v.paused ? PLAY : PAUSE;
      btn.dataset.state = v.paused ? 'paused' : 'playing';
      btn.setAttribute('aria-label', `${v.paused ? 'Play' : 'Pause'}: ${name}`);
    };
    v.addEventListener('play', show);
    v.addEventListener('pause', show);
    btn.addEventListener('click', () => {
      const s = state.get(v)!;
      s.held = !v.paused;
      if (s.held) v.pause(); else v.play().catch(() => {});
    });
    v.after(btn);
    show();
    io.observe(v);
  }
}

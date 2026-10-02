// A mouse-click sound on every click, anywhere on the page. A mouse plays it
// as the button goes down, like a real one; a tap plays it on the tap itself
// (so scrolling a phone stays quiet); keyboard activation doesn't click.
//
// The sound is fetched and decoded as the page loads and trimmed of the
// silence at its start (MP3s carry some), then played through Web Audio:
// it starts on the press, and quick clicks overlap instead of cutting each
// other off. A missing file just means no clicks.
export function clickSounds(url: string, volume = 0.7) {
  let buffer: AudioBuffer | null = null;
  let head = 0; // seconds of leading silence to skip
  let ctx: AudioContext | null = null;
  let out: GainNode;

  fetch(url)
    .then((r) => { if (!r.ok) throw new Error(`clicks: ${r.status}`); return r.arrayBuffer(); })
    // decoded off any live context, so nothing asks to play before a click
    .then((b) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(b))
    .then((b) => {
      const d = b.getChannelData(0);
      let i = 0;
      while (i < d.length && Math.abs(d[i]) < 0.02) i++;
      head = Math.max(0, i / b.sampleRate - 0.002);
      buffer = b;
    })
    .catch(() => {});

  const play = () => {
    if (!buffer) return;
    // the context is made (and resumed) inside the press, which browsers
    // count as permission to play sound
    if (!ctx) {
      ctx = new AudioContext();
      out = ctx.createGain();
      out.gain.value = volume;
      out.connect(ctx.destination);
    }
    if (ctx.state !== 'running') void ctx.resume();
    const s = ctx.createBufferSource();
    s.buffer = buffer;
    s.playbackRate.value = 0.97 + Math.random() * 0.06; // a little variation
    s.connect(out);
    s.start(0, head);
  };

  let pointer = 'mouse';
  addEventListener('pointerdown', (e) => {
    pointer = e.pointerType;
    if (e.pointerType === 'mouse' && e.button === 0) play();
  }, { capture: true, passive: true });
  addEventListener('click', (e) => {
    // detail is 0 for clicks made with the keyboard
    if (pointer !== 'mouse' && e.detail > 0) play();
  }, { capture: true, passive: true });
}

// The accent colour lives in one place: `--accent` / `--accent-hi` in
// styles.css. Canvas-drawn bits (dust, icons, grid crosses) read it here.
const css = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

export const accent = () => css('--accent', '#ff7a2e');
export const accentHi = () => css('--accent-hi', '#ffa25c');

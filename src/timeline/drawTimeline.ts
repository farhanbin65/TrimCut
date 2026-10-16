import type { Clip } from '../types';
import { length } from '../model';
interface DrawOptions {
  width: number; height: number; scale: number; scroll: number;
  time: number; selected: string | null; clips: readonly Clip[];
}
export function drawTimeline(canvas: HTMLCanvasElement, options: DrawOptions) {
  const { width, height, scale, scroll, clips, time, selected } = options;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const theme = getComputedStyle(canvas);
  const color = (name: string) => theme.getPropertyValue(name).trim();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = color('--bg-0'); ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color('--bg-1'); ctx.fillRect(0, 36, width, 78);
  ctx.font = '10px ui-monospace, monospace';
  const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600].find(s => s * scale >= 65) || 1200;
  for (let t = Math.floor(scroll / scale / step) * step; t <= (scroll + width) / scale; t += step) {
    const x = 16 + t * scale - scroll;
    ctx.fillStyle = color('--text-2'); ctx.fillText(`${t.toFixed(step < 1 ? 1 : 0)}s`, x + 4, 17);
    ctx.fillStyle = color('--border'); ctx.fillRect(x, 25, 1, height - 25);
    for (let n = 1; n < 5; n++) ctx.fillRect(x + n * step * scale / 5, 29, 1, 5);
  }
  let start = 0;
  for (const clip of clips) {
    const x = 16 + start * scale - scroll, w = length(clip) * scale;
    if (x + w >= 0 && x <= width) {
      ctx.fillStyle = clip.id === selected ? color('--clip-selected') : color('--clip-bg');
      ctx.beginPath(); ctx.roundRect(x, 48, Math.max(1, w), 52, 5); ctx.fill();
      ctx.strokeStyle = clip.id === selected ? color('--accent') : color('--clip-border');
      ctx.lineWidth = clip.id === selected ? 2 : 1; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.rect(x + 9, 49, Math.max(0, w - 18), 50); ctx.clip();
      ctx.fillStyle = color('--text-1'); ctx.font = '11px system-ui'; ctx.fillText(clip.name, x + 12, 70);
      ctx.fillStyle = color('--text-2'); ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`${length(clip).toFixed(2)}s`, x + 12, 88); ctx.restore();
      if (clip.id === selected) {
        ctx.fillStyle = color('--accent'); ctx.fillRect(x + 3, 65, 2, 16); ctx.fillRect(x + w - 5, 65, 2, 16);
      }
    }
    start += length(clip);
  }
  const x = 16 + time * scale - scroll;
  ctx.fillStyle = color('--playhead'); ctx.fillRect(x - 0.5, 29, 1, height - 29);
  ctx.beginPath(); ctx.moveTo(x - 5, 23); ctx.lineTo(x + 5, 23); ctx.lineTo(x + 5, 29);
  ctx.lineTo(x, 34); ctx.lineTo(x - 5, 29); ctx.closePath(); ctx.fill();
}

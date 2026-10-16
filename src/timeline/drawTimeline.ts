import { drawAnalysis } from './drawAnalysis';
import type { MediaAnalysisCache } from '../media/cache/analysis';
import type { EditorDocument } from '../editor/types';
import { clipLength } from '../editor/math';
export const RULER_HEIGHT = 36, TRACK_HEIGHT = 68;
interface DrawOptions {
  width: number; height: number; scale: number; scroll: number;
  scrollY: number; cache: MediaAnalysisCache | null; selection: string[]; document: EditorDocument; snapGuide: number | null;
}
export function drawTimeline(canvas: HTMLCanvasElement, o: DrawOptions) {
  const { width, height, scale, scroll, document, selection } = o;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const theme = getComputedStyle(canvas), color = (name: string) => theme.getPropertyValue(name).trim();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = color('--bg-0'); ctx.fillRect(0, 0, width, height);
  document.tracks.forEach((track, i) => {
    if (RULER_HEIGHT + (i + 1) * TRACK_HEIGHT < o.scrollY || RULER_HEIGHT + i * TRACK_HEIGHT > o.scrollY + height) return;
    ctx.fillStyle = color(i % 2 ? '--bg-0' : '--bg-1'); ctx.fillRect(0, RULER_HEIGHT + i * TRACK_HEIGHT - o.scrollY, width, TRACK_HEIGHT);
    if (track.locked) { ctx.fillStyle = color('--text-2'); ctx.fillText('Locked', 8, RULER_HEIGHT + i * TRACK_HEIGHT - o.scrollY + 22); }
  });
  ctx.font = '10px ui-monospace, monospace';
  const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600].find(s => s * scale >= 65) || 1200;
  for (let t = Math.floor(scroll / scale / step) * step; t <= (scroll + width) / scale; t += step) {
    const x = 16 + t * scale - scroll;
    ctx.fillStyle = color('--text-2'); ctx.fillText(`${t.toFixed(step < 1 ? 1 : 0)}s`, x + 4, 17 - o.scrollY);
    ctx.fillStyle = color('--border'); ctx.fillRect(x, Math.max(0, 25 - o.scrollY), 1, height);
  }
  for (const c of Object.values(document.clips)) {
    const row = document.tracks.findIndex(t => t.id === c.trackId), track = document.tracks[row];
    const x = 16 + c.start * scale - scroll, w = clipLength(c) * scale, y = RULER_HEIGHT + row * TRACK_HEIGHT + 8 - o.scrollY;
    if (x + w < 0 || x > width || y + 52 < 0 || y > height) continue;
    const selected = selection.includes(c.id); ctx.globalAlpha = track.hidden ? 0.4 : 1;
    ctx.fillStyle = selected ? color('--clip-selected') : color('--clip-bg');
    ctx.beginPath(); ctx.roundRect(x, y, Math.max(1, w), 52, 5); ctx.fill();
    ctx.strokeStyle = selected ? color('--accent') : color('--clip-border'); ctx.lineWidth = selected ? 2 : 1; ctx.stroke();
    drawAnalysis(ctx, o.cache?.get(c.assetId), c, document.assets[c.assetId].duration, x, y, scale, width);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 9, y, Math.max(0, w - 18), 50); ctx.clip();
    ctx.fillStyle = color('--text-1'); ctx.font = '11px system-ui'; ctx.fillText(document.assets[c.assetId]?.name || 'Missing media', x + 12, y + 21);
    ctx.fillStyle = color('--text-2'); ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#000a'; ctx.fillRect(x + 8, y + 5, Math.max(0, w - 16), 20);
    ctx.fillStyle = color('--text-1'); ctx.fillText(document.assets[c.assetId]?.name || 'Missing media', x + 12, y + 20); ctx.restore();
    if (selected) { ctx.fillStyle = color('--accent'); ctx.fillRect(x + 3, y + 18, 2, 16); ctx.fillRect(x + w - 5, y + 18, 2, 16); }
    ctx.globalAlpha = 1;
  }
  if (o.scrollY < 36) for (const marker of document.markers) {
    const x = 16 + marker.time * scale - scroll;
    ctx.fillStyle = color('--accent'); ctx.beginPath(); ctx.moveTo(x, 20 - o.scrollY); ctx.lineTo(x + 4, 24 - o.scrollY); ctx.lineTo(x, 28 - o.scrollY); ctx.lineTo(x - 4, 24 - o.scrollY); ctx.fill();
  }
  if (o.snapGuide !== null) { ctx.fillStyle = color('--accent'); ctx.fillRect(16 + o.snapGuide * scale - scroll, 29, 1, height - 29); }
}

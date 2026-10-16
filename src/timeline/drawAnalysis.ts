import type { Analysis } from '../media/cache/analysis';
import type { TimelineClip } from '../editor/types';
export function drawAnalysis(ctx: CanvasRenderingContext2D, analysis: Analysis | undefined,
  clip: TimelineClip, sourceDuration: number, x: number, y: number, scale: number, viewportWidth: number) {
  if (!analysis) return;
  const width = (clip.out - clip.in) * scale;
  ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, Math.max(0, width - 2), 50); ctx.clip();
  const first = Math.max(0, Math.floor(-x / 72)), last = Math.ceil((Math.min(viewportWidth, x + width) - x) / 72);
  ctx.globalAlpha *= 0.65;
  if (analysis.thumbnails.length) for (let tile = first; tile < last; tile++) {
    const at = clip.in + tile * 72 / scale;
    const thumb = analysis.thumbnails.reduce((best, t) => Math.abs(t.time - at) < Math.abs(best.time - at) ? t : best);
    ctx.drawImage(thumb.image, x + tile * 72, y + 1, 72, 40);
  }
  if (analysis.peaks) {
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#5de4d3';
    for (let px = Math.max(1, Math.floor(-x)); px < Math.min(width - 1, viewportWidth - x); px += 2) {
      const time = clip.in + px / scale, bin = Math.floor(time / sourceDuration * analysis.peaks.length);
      const height = Math.max(1, (analysis.peaks[bin] || 0) * 18);
      ctx.fillRect(x + px, y + 41 - height / 2, 1, height);
    }
  }
  ctx.restore();
}

import { useEffect, useState } from 'react';
export type Panel = 'media' | 'inspector' | 'timeline';
export const PANEL_LIMITS: Record<Panel, readonly [number, number]> = {
  media: [190, 380], inspector: [240, 400], timeline: [180, 420],
};
const defaults: Record<Panel, number> = { media: 250, inspector: 280, timeline: 250 };
export function usePanelSizes() {
  const [sizes, setSizes] = useState(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem('trimcut.panels.v1') || 'null');
      if (!parsed || typeof parsed !== 'object') return defaults;
      return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
        const value = (parsed as Record<string, unknown>)[key];
        const [min, max] = PANEL_LIMITS[key as Panel];
        return [key, typeof value === 'number' && Number.isFinite(value)
          ? Math.max(min, Math.min(max, value)) : fallback];
      })) as Record<Panel, number>;
    } catch { return defaults; }
  });
  useEffect(() => {
    try { localStorage.setItem('trimcut.panels.v1', JSON.stringify(sizes)); }
    catch { /* Layout still works when browser storage is unavailable. */ }
  }, [sizes]);
  function resize(panel: Panel, value: number) {
    const [min, max] = PANEL_LIMITS[panel];
    setSizes(s => ({ ...s, [panel]: Math.max(min, Math.min(max, value)) }));
  }
  return { sizes, resize };
}

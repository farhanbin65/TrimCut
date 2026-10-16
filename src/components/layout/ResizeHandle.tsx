import { useRef } from 'react';
import { PANEL_LIMITS } from '../../hooks/usePanelSizes';
import type { Panel } from '../../hooks/usePanelSizes';
interface Props { panel: Panel; value: number; onResize: (value: number) => void }
export function ResizeHandle({ panel, value, onResize }: Props) {
  const origin = useRef<{ position: number; value: number } | null>(null);
  const horizontal = panel === 'timeline';
  const direction = panel === 'media' ? 1 : -1;
  const [min, max] = PANEL_LIMITS[panel];
  return <div role="separator" tabIndex={0} aria-label={`Resize ${panel} panel`}
    aria-controls={`${panel}-panel`} aria-orientation={horizontal ? 'horizontal' : 'vertical'}
    aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(value)}
    className={`resize-handle ${horizontal ? 'horizontal' : 'vertical'}`}
    onDoubleClick={() => onResize(panel === 'inspector' ? 280 : 250)}
    onPointerDown={event => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      origin.current = { position: horizontal ? event.clientY : event.clientX, value };
    }}
    onPointerMove={event => {
      if (!origin.current) return;
      const delta = (horizontal ? event.clientY : event.clientX) - origin.current.position;
      onResize(origin.current.value + delta * direction);
    }}
    onPointerUp={() => { origin.current = null; }}
    onPointerCancel={() => { origin.current = null; }}
    onKeyDown={event => {
      const previous = horizontal ? 'ArrowUp' : 'ArrowLeft';
      const next = horizontal ? 'ArrowDown' : 'ArrowRight';
      if (event.key === previous || event.key === next) {
        event.preventDefault();
        onResize(value + (event.key === next ? 10 : -10) * direction);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        onResize(event.key === 'Home' ? min : max);
      }
    }} />;
}

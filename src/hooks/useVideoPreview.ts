import { useEffect, useRef } from 'react';
import { Compositor } from '../engine/compositor';
import { useEditor } from '../store';
export function useVideoPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let engine: Compositor | undefined;
    try { engine = new Compositor(() => canvasRef.current); }
    catch { useEditor.getState().setError('This browser cannot initialize the preview audio engine.'); }
    return () => engine?.dispose();
  }, []);
  return { canvasRef };
}

import { useEditor } from '../../store';
import { duration, timecode } from '../../model';
import { FPS } from '../../types';
import { IconButton } from '../ui/IconButton';
export function Transport({ busy }: { busy: boolean }) {
  const time = useEditor(s => s.time);
  const playing = useEditor(s => s.playing);
  const total = useEditor(s => duration(s.clips));
  const disabled = busy || !total;
  function step(delta: number) {
    const state = useEditor.getState();
    state.play(false); state.seek(state.time + delta / FPS);
  }
  function jump(time: number) {
    useEditor.getState().play(false); useEditor.getState().seek(time);
  }
  function toggle() {
    const state = useEditor.getState();
    if (state.time >= total) state.seek(0);
    state.play(!state.playing);
  }
  return <div className="transport">
    <output className="timecode"><strong>{timecode(time)}</strong><span> / {timecode(total)}</span></output>
    <div className="transport-buttons">
      <IconButton icon="skip-back" label="Go to start" disabled={disabled} onClick={() => jump(0)} />
      <IconButton icon="frame-step" className="flip-icon" label="Previous frame" disabled={disabled} onClick={() => step(-1)} />
      <IconButton icon={playing ? 'pause' : 'play'} className="play-button" label={playing ? 'Pause' : 'Play'} disabled={disabled} onClick={toggle} />
      <IconButton icon="frame-step" label="Next frame" disabled={disabled} onClick={() => step(1)} />
      <IconButton icon="skip-forward" label="Go to end" disabled={disabled} onClick={() => jump(total)} />
    </div>
    <span className="fps-label">30 fps</span>
  </div>;
}

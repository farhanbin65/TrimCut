import { useEditor } from '../../store';
import { IconButton } from '../ui/IconButton';
import { TRACK_HEIGHT, RULER_HEIGHT } from '../../timeline/drawTimeline';
export function TrackHeaders({ busy, scrollTop }: { busy: boolean; scrollTop: number }) {
  const tracks = useEditor(s => s.document.tracks), toggle = useEditor(s => s.toggleTrack);
  return <div className="track-headers"><div style={{ transform: `translateY(-${scrollTop}px)` }}>
    <div className="track-ruler" style={{ height: RULER_HEIGHT }}>TRACKS <span>{tracks.length}</span></div>
    {tracks.map(track => <div key={track.id} className="track-title" style={{ height: TRACK_HEIGHT }}>
      <span title={track.name}>{track.name}</span>
      <IconButton icon="lock" label={`${track.locked ? 'Unlock' : 'Lock'} ${track.name}`} active={track.locked}
        aria-pressed={track.locked} disabled={busy} onClick={() => toggle(track.id, 'locked')} />
      <IconButton icon={track.hidden ? 'eye-off' : 'eye'} label={`${track.hidden ? 'Show' : 'Hide'} ${track.name}`}
        aria-pressed={track.hidden} disabled={busy} onClick={() => toggle(track.id, 'hidden')} />
    </div>)}
  </div></div>;
}

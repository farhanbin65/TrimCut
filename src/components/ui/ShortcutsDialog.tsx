import { useEffect, useRef } from 'react';
import { IconButton } from './IconButton';
const upcoming = [['Space', 'Play / pause'], ['S', 'Split at playhead'], ['Delete', 'Remove selection'],
  ['⌘ / Ctrl Z', 'Undo'], ['⌘ / Ctrl Shift Z', 'Redo'], ['⌘ / Ctrl C / V / D', 'Copy / paste / duplicate'],
  ['+ / −', 'Timeline zoom'], ['← / →', 'Step one frame'], ['J / K / L', 'Shuttle playback'], ['M', 'Add marker']];
export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal(); else ref.current?.close();
  }, [open]);
  return <dialog ref={ref} className="shortcuts-dialog" onClose={onClose} aria-labelledby="shortcuts-title"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="panel-heading"><h2 id="shortcuts-title">Keyboard shortcuts</h2><IconButton icon="close" label="Close shortcuts" onClick={onClose} /></div>
    <p className="muted">Available now: Tab to navigate; arrow keys to resize focused panel dividers, switch tabs, and scrub the focused timeline.</p>
    <h3>Planned editing shortcuts <span className="badge">Later phase</span></h3>
    <div className="shortcut-list">{upcoming.map(([key, action]) => <div key={key}><span>{action}</span><kbd>{key}</kbd></div>)}</div>
    <p className="muted">Editing shortcuts are not active yet. Escape closes this dialog.</p>
  </dialog>;
}

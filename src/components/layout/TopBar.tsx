import { useEditor } from '../../store';
import { Icon } from '../icons';
import { IconButton } from '../ui/IconButton';
interface Props { busy: boolean; onExport: () => void; onHelp: () => void; onSave: () => void }
export function TopBar({ busy, onExport, onHelp, onSave }: Props) {
  const name = useEditor(s => s.projectName);
  const setName = useEditor(s => s.setProjectName);
  const hasClips = useEditor(s => s.clips.length > 0);
  return <header className="top-bar">
    <a className="brand" href="/" aria-label="TrimCut Studio home">
      <span className="brand-mark"><Icon name="split" size={22} /></span><strong>TrimCut<span>STUDIO</span></strong>
    </a>
    <span className="divider" />
    <div className="project-title"><input aria-label="Project name" value={name} maxLength={80}
      disabled={busy} onChange={e => setName(e.target.value)} onBlur={() => { if (!name.trim()) setName('Untitled project'); }} />
      <span className="project-status"><span /> Local project</span>
    </div>
    <div className="top-actions">
      <IconButton icon="undo" label="Undo — available in Phase 2" disabled />
      <IconButton icon="redo" label="Redo — available in Phase 2" disabled />
      <span className="divider" />
      <button className="text-button" onClick={onSave} disabled={busy || !hasClips}>
        <Icon name="folder" size={17} /> Save JSON
      </button>
      <IconButton icon="keyboard" label="Keyboard shortcuts" onClick={onHelp} />
      <button className="button accent" disabled={busy || !hasClips} onClick={onExport}>
        <Icon name="export" size={18} /> Export
      </button>
    </div>
  </header>;
}

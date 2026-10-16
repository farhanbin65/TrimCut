import { useEditor } from '../../store';
import { IconButton } from '../ui/IconButton';
export function HistoryButtons({ busy }: { busy: boolean }) {
  const history = useEditor(s => s.history), transaction = useEditor(s => s.transaction);
  const undo = useEditor(s => s.undo), redo = useEditor(s => s.redo);
  return <><IconButton icon="undo" label={`Undo${history.past.length ? `: ${history.past.at(-1)?.label}` : ''}`}
    disabled={busy || !!transaction || !history.past.length} onClick={undo} />
    <IconButton icon="redo" label={`Redo${history.future.length ? `: ${history.future.at(-1)?.label}` : ''}`}
      disabled={busy || !!transaction || !history.future.length} onClick={redo} /></>;
}

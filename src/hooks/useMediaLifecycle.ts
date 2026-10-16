import { useEffect, useState } from 'react';
import { useEditor } from '../store';
import { MediaAnalysisCache } from '../media/cache/analysis';
export function useMediaLifecycle() {
  const [cache] = useState(() => new MediaAnalysisCache());
  useEffect(() => {
    const unsubscribe = useEditor.subscribe((s, old) => {
      if (s.document === old.document && s.history === old.history && s.transaction === old.transaction) return;
      cache.prune(new Set(Object.keys(s.document.assets)));
      // A source must survive every undo/redo entry and an in-progress gesture.
      const keep = new Set(Object.keys(s.document.assets));
      for (const command of [...s.history.past, ...s.history.future]) {
        Object.keys(command.before.document.assets).forEach(id => keep.add(id));
        Object.keys(command.after.document.assets).forEach(id => keep.add(id));
      }
      s.clipboard.forEach(c => keep.add(c.assetId));
      if (s.transaction) Object.keys(s.transaction.document.assets).forEach(id => keep.add(id));
      const media = { ...s.media }; let changed = false;
      for (const [id, runtime] of Object.entries(media)) if (!keep.has(id)) {
        URL.revokeObjectURL(runtime.url); if (runtime.proxyUrl) URL.revokeObjectURL(runtime.proxyUrl);
        delete media[id]; changed = true;
      }
      if (changed) useEditor.setState({ media });
    });
    return () => { unsubscribe(); cache.dispose(); };
  }, [cache]);
  return cache;
}

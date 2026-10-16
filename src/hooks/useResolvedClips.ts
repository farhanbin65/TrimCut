import { useMemo } from 'react';
import { useEditor } from '../store';
import { resolveClips } from '../editor/selectors';
export function useResolvedClips() {
  const document = useEditor(s => s.document);
  const media = useEditor(s => s.media);
  return useMemo(() => resolveClips(document, media), [document, media]);
}

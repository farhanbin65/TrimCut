import { createContext, useContext, useSyncExternalStore } from 'react';
import { MediaAnalysisCache } from './analysis';
export const AnalysisContext = createContext<MediaAnalysisCache | null>(null);
const emptySubscribe = () => () => {}, zero = () => 0;
export function useAnalysis() {
  const cache = useContext(AnalysisContext);
  const revision = useSyncExternalStore(cache?.subscribe || emptySubscribe, cache?.snapshot || zero);
  return { cache, revision };
}

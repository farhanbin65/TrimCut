import { create } from 'zustand';
export const usePreviewSettings = create<{
  quality: 'auto' | 'original' | 'proxy'; decoder: 'auto' | 'browser'; volume: number;
  level: number; status: string; channels: number; webCodecs: number;
}>(() => ({ quality: 'auto', decoder: 'auto', volume: 0.8, level: 0, status: 'Ready', channels: 0, webCodecs: 0 }));

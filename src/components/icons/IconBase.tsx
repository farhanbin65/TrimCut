import type { ReactNode } from 'react';
export interface IconProps { size?: number; className?: string }
export function IconBase({ size = 20, className, children }: IconProps & { children: ReactNode }) {
  return <svg width={size} height={size} className={className} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"
    strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}

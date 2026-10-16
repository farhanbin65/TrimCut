import { IconBase } from './IconBase';
import type { IconProps } from './IconBase';
export function Blend(props: IconProps) {
  return <IconBase {...props}><circle cx="8" cy="12" r="6" /><circle cx="16" cy="12" r="6" /><path d="m10 8 4 8m-4-4 2 4" /></IconBase>;
}

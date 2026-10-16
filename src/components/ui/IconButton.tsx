import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../icons';
import type { IconName } from '../icons';
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  active?: boolean;
}
export function IconButton({ icon, label, active = false, className = '', ...props }: Props) {
  return <button type="button" aria-label={label} title={label}
    className={`icon-button ${active ? 'is-active' : ''} ${className}`} {...props}>
    <Icon name={icon} />
  </button>;
}

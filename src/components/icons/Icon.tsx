import { iconComponents } from './registry';
import type { IconName } from './registry';
import type { IconProps } from './IconBase';
export function Icon({ name, ...props }: IconProps & { name: IconName }) {
  const Component = iconComponents[name];
  return <Component {...props} />;
}

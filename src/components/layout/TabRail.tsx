import { Icon } from '../icons';
import type { IconName } from '../icons';
export const LIBRARY_TABS = [
  ['media', 'Media'], ['audio', 'Audio'], ['text', 'Text'], ['stickers', 'Stickers'],
  ['effects', 'Effects'], ['transitions', 'Transitions'], ['captions', 'Captions'],
  ['filters', 'Filters'], ['adjustment', 'Adjustment'], ['templates', 'Templates'],
] as const satisfies readonly (readonly [IconName, string])[];
export type LibraryTab = typeof LIBRARY_TABS[number][0];
export function TabRail({ active, onChange }: { active: LibraryTab; onChange: (tab: LibraryTab) => void }) {
  return <nav className="tab-rail" aria-label="Asset categories" role="tablist" aria-orientation="vertical">
    {LIBRARY_TABS.map(([icon, label], index) => <button key={icon} id={`tab-${icon}`} role="tab"
      aria-selected={active === icon} aria-controls="media-panel" tabIndex={active === icon ? 0 : -1}
      aria-label={label} className={active === icon ? 'rail-tab is-active' : 'rail-tab'}
      onClick={() => onChange(icon)} onKeyDown={event => {
        let next = index;
        if (event.key === 'ArrowDown') next = (index + 1) % LIBRARY_TABS.length;
        else if (event.key === 'ArrowUp') next = (index - 1 + LIBRARY_TABS.length) % LIBRARY_TABS.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = LIBRARY_TABS.length - 1;
        else return;
        event.preventDefault();
        const tab = LIBRARY_TABS[next][0];
        onChange(tab);
        document.getElementById(`tab-${tab}`)?.focus();
      }}><Icon name={icon} /><span>{label}</span></button>)}
  </nav>;
}

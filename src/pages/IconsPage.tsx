import { useState } from 'react';
import { Icon, iconComponents } from '../components/icons';
import type { IconName } from '../components/icons';
const names = Object.keys(iconComponents) as IconName[];
export function IconsPage() {
  const [search, setSearch] = useState('');
  const visible = names.filter(name => name.includes(search.toLowerCase()));
  return <main className="icons-page"><header className="gallery-header"><div><a href="/">← Back to TrimCut</a>
    <h1>Small strokes. Clear actions.</h1><p>{names.length} original icons · 24 × 24 viewBox · 1.75 stroke · currentColor</p></div>
    <label className="search-field"><Icon name="search" /><input aria-label="Find an icon" placeholder="Find an icon…" value={search} onChange={e => setSearch(e.target.value)} /></label>
  </header>
    {(['dark', 'light'] as const).map(theme => <section key={theme} data-theme={theme} className="gallery-theme">
      <div className="gallery-theme-header"><h2>{theme === 'dark' ? 'Dark' : 'Light'} theme</h2><span>16 / 20 / 24 / 32 px</span></div>
      <div className="icon-grid">{visible.map(name => <article className="icon-card" key={name}>
        <div className="icon-sizes">{[16, 20, 24, 32].map(size => <span key={size}><Icon name={name} size={size} /><small>{size}</small></span>)}</div>
        <h3>{name}</h3><div className="icon-states">
          <button className="icon-button" aria-label={`${name} default`} title="Hover or focus to inspect"><Icon name={name} size={16} /></button>
          <button className="icon-button is-active" aria-label={`${name} active`} aria-pressed="true"><Icon name={name} size={16} /></button>
          <button className="icon-button" aria-label={`${name} disabled`} disabled><Icon name={name} size={16} /></button>
        </div>
      </article>)}</div>
      {!visible.length && <p>No icons match your search.</p>}
    </section>)}
  </main>;
}

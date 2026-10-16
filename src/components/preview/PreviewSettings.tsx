import { usePreviewSettings } from '../../engine/settings';
export function PreviewSettings() {
  const settings = usePreviewSettings();
  return <div className="preview-settings">
    <select aria-label="Preview source quality" value={settings.quality} onChange={e => usePreviewSettings.setState({ quality: e.target.value as typeof settings.quality })}>
      <option value="auto">Auto / proxy</option><option value="original">Original</option><option value="proxy">Proxy if available</option>
    </select>
    <select aria-label="Preview decoder" value={settings.decoder} onChange={e => usePreviewSettings.setState({ decoder: e.target.value as typeof settings.decoder })}>
      <option value="auto">Auto decoder</option><option value="browser">Browser decoder</option>
    </select>
    <label>Monitor <input type="range" aria-label="Preview monitor volume" min={0} max={1} step={0.05} value={settings.volume}
      onChange={e => usePreviewSettings.setState({ volume: Number(e.target.value) })} /></label>
    <meter aria-label="Preview audio level" min={0} max={1} value={settings.level} />
    <output aria-live="polite">{settings.status} · {settings.channels} sources · {settings.webCodecs} WebCodecs</output>
  </div>;
}

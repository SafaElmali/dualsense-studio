import { StickArrowSettings } from './stick-arrow-settings.js';
import { ButtonHighlight } from './button-highlight.js';

// One portable, validated configuration for the preview and capture page.
export class StreamerSettings {
  static defaults = Object.freeze({ ...StickArrowSettings.defaults, camera: 'custom', pitch: 40, yaw: -0.8, roll: 0, triggerMeters: 'show', body: '#e9eaf0', light: '#0046ff', highlight: ButtonHighlight.defaults.color, highlightOpacity: ButtonHighlight.defaults.opacity, background: 'transparent', color: '#111215', scale: 75, slot: 'auto' });

  static normalize(values = {}) {
    const result = { ...this.defaults, ...StickArrowSettings.normalize(values) };
    for (const key of ['body', 'light', 'highlight', 'color']) {
      if (/^#[\da-f]{6}$/i.test(values[key])) result[key] = values[key].toLowerCase();
    }
    if (['auto', 'front', 'angle', 'back', 'triggers', 'custom'].includes(values.camera)) result.camera = values.camera;
    if (['show', 'hide'].includes(values.triggerMeters)) result.triggerMeters = values.triggerMeters;
    for (const axis of ['pitch', 'yaw', 'roll']) {
      const value = String(values[axis] ?? '').trim();
      if (value !== '' && Number.isFinite(Number(value))) result[axis] = Math.round(Math.max(-180, Math.min(180, Number(value))) * 10) / 10;
    }
    if (['transparent', 'green', 'blue', 'solid'].includes(values.background)) result.background = values.background;
    if (['auto', '0', '1', '2', '3'].includes(String(values.slot))) result.slot = String(values.slot);
    if (values.scale !== '' && values.scale !== null && Number.isFinite(Number(values.scale))) result.scale = Math.round(Math.max(60, Math.min(120, Number(values.scale))));
    const opacity = String(values.highlightOpacity ?? '').trim();
    if (opacity !== '' && Number.isFinite(Number(opacity))) result.highlightOpacity = Math.round(Math.max(0, Math.min(100, Number(opacity))));
    return result;
  }

  static read(search) { return this.normalize(Object.fromEntries(new URLSearchParams(search))); }

  static forOBS(values, method, chroma = 'green') {
    return this.normalize({ ...values, background: method === 'window' ? (chroma === 'blue' ? 'blue' : 'green') : 'transparent' });
  }

  static query(values) {
    const settings = this.normalize(values);
    if (settings.camera !== 'custom') for (const axis of ['pitch', 'yaw', 'roll']) delete settings[axis];
    return new URLSearchParams(Object.entries(settings)).toString();
  }

  static url(base, values, { setup = false } = {}) {
    const url = new URL('overlay.html', base);
    url.search = this.query(values);
    url.hash = setup ? 'setup' : '';
    return url.href;
  }

  static background(values) {
    const settings = this.normalize(values);
    return { transparent: 'transparent', green: '#00ff00', blue: '#0000ff', solid: settings.color }[settings.background];
  }
}

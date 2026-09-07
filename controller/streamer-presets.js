import { StreamerSettings } from './streamer-settings.js';

export class StreamerPresets {
  static storageKey = 'dualsense-streamer-looks-v1';
  static limit = 12;
  static looks = [
    { id: 'clean', name: 'Clean', settings: { body: '#e9eaf0', light: '#0046ff', highlight: '#ffbf47', camera: 'angle' } },
    { id: 'neon', name: 'Neon', settings: { body: '#262337', light: '#b87cff', highlight: '#64ffcf', camera: 'angle', arrowColor: '#64ffcf' } },
    { id: 'dark', name: 'Dark', settings: { body: '#252a31', light: '#6fb9ff', highlight: '#d5ecff', camera: 'front', triggerMeters: 'hide' } },
    { id: 'minimal', name: 'Minimal', settings: { body: '#eee9df', light: '#dfb77c', highlight: '#dfa365', camera: 'front', triggerMeters: 'hide', stickArrows: 'hide' } },
  ];

  static applyLook(id, current) {
    const look = this.looks.find(item => item.id === id);
    if (!look) throw new Error('Choose an available look.');
    return StreamerSettings.normalize({ ...this.lookSettings(look), slot: current.slot, background: current.background, color: current.color });
  }

  static lookSettings(look) { return StreamerSettings.normalize(look.settings); }

  constructor(storage) { this.storage = storage; }

  list() {
    let records;
    try {
      if (!this.storage) throw new Error();
      records = JSON.parse(this.storage.getItem(StreamerPresets.storageKey) ?? '[]');
    } catch { throw new Error('Saved looks are unavailable. Allow browser storage to save a look on this device.'); }
    if (!Array.isArray(records)) throw new Error('Saved looks could not be read. Your current overlay is still available.');
    return records.filter(record => record && typeof record.id === 'string' && typeof record.name === 'string' && record.name.trim() && record.name.length <= 32 && record.settings && typeof record.settings === 'object')
      .slice(0, StreamerPresets.limit)
      .map(({ id, name, settings }) => ({ id, name, settings: StreamerSettings.normalize(settings) }));
  }

  save(name, settings) {
    name = typeof name === 'string' ? name.normalize('NFKC').trim().replace(/\s+/g, ' ') : '';
    if (!name || name.length > 32) throw new Error('Give your look a name using 1–32 characters.');
    const records = this.list();
    if (records.some(record => record.name.toLowerCase() === name.toLowerCase())) throw new Error('That name is already saved. Choose a different name.');
    if (records.length >= StreamerPresets.limit) throw new Error('You have 12 saved looks. Remove one before saving another.');
    const record = { id: crypto.randomUUID(), name, settings: StreamerSettings.normalize(settings) };
    this.write([...records, record]);
    return record;
  }

  remove(id) {
    const records = this.list();
    this.write(records.filter(record => record.id !== id));
  }

  write(records) {
    try { this.storage.setItem(StreamerPresets.storageKey, JSON.stringify(records)); }
    catch { throw new Error('This browser could not save the change. Free some browser storage and try again.'); }
  }
}

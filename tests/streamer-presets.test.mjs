import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamerPresets } from '../controller/streamer-presets.js';
import { StreamerSettings } from '../controller/streamer-settings.js';
import { ControllerAnalytics } from '../controller/analytics-service.js';

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}

test('named looks persist a complete normalized overlay across visits without unrelated data', () => {
  const saved = storage();
  const settings = StreamerSettings.normalize({ camera: 'custom', pitch: 21.7, yaw: -76, roll: 11, highlightOpacity: 0, stickArrows: 'hide', triggerMeters: 'hide', slot: '2', background: 'blue', gyro: 'full' });
  const record = new StreamerPresets(saved).save('  Friday   night  ', { ...settings, scene: 'night', secret: 'not-an-overlay-setting' });
  assert.equal(record.name, 'Friday night');
  assert.deepEqual(new StreamerPresets(saved).list(), [{ ...record, settings }]);
  assert.equal(saved.getItem(StreamerPresets.storageKey).includes('not-an-overlay-setting'), false);
  assert.deepEqual(StreamerSettings.read(new URL(StreamerSettings.url('https://example.com/streamer.html', record.settings)).search), settings);
});

test('invalid and duplicate names cannot silently replace a saved look', () => {
  const saved = storage(), service = new StreamerPresets(saved);
  const original = service.save('Neon nights', { body: '#123456' });
  for (const name of ['', ' '.repeat(3), 'a'.repeat(33), null, ' NEON NIGHTS ']) assert.throws(() => service.save(name, { body: '#ffffff' }));
  assert.deepEqual(service.list(), [original]);
});

test('removing a look frees capacity and retains the other saved looks', () => {
  const saved = storage(), service = new StreamerPresets(saved);
  const records = Array.from({ length: StreamerPresets.limit }, (_, i) => service.save('Look ' + i, { scale: 60 + i }));
  assert.throws(() => service.save('One more', {}), /12 saved looks/);
  service.remove(records[4].id);
  const replacement = new StreamerPresets(saved).save('One more', { body: '#112233' });
  assert.deepEqual(service.list(), [...records.filter((_, i) => i !== 4), replacement]);
});

test('storage failures preserve saved records and report an actionable error', () => {
  const saved = storage(), service = new StreamerPresets(saved);
  const original = service.save('Original', {});
  saved.setItem = () => { throw new Error('private implementation details'); };
  assert.throws(() => service.save('New', {}), /could not save the change/);
  assert.throws(() => service.remove(original.id), /could not save the change/);
  assert.deepEqual(service.list(), [original]);
  assert.throws(() => new StreamerPresets().save('New', {}), /Allow browser storage/);
});

test('malformed saved data cannot become unsafe settings or silently overwrite broken storage', () => {
  const saved = storage(), service = new StreamerPresets(saved);
  saved.setItem(StreamerPresets.storageKey, 'broken JSON');
  assert.throws(() => service.save('New', {}));
  assert.equal(saved.getItem(StreamerPresets.storageKey), 'broken JSON');
  saved.setItem(StreamerPresets.storageKey, JSON.stringify([null, { id: 'one', name: 'Old look', settings: { body: 'url(evil)', scale: 1000, camera: 'invalid' } }]));
  assert.deepEqual(service.list(), [{ id: 'one', name: 'Old look', settings: StreamerSettings.normalize({ scale: 120 }) }]);
});

test('ready-made looks coordinate the overlay without changing the selected controller or capture background', () => {
  const current = StreamerSettings.normalize({ slot: '3', background: 'solid', color: '#abcdef', camera: 'custom', pitch: 45, gyro: 'subtle' });
  for (const look of StreamerPresets.looks) {
    const applied = StreamerPresets.applyLook(look.id, current);
    assert.equal(applied.gyro, 'subtle'); assert.equal(applied.slot, '3'); assert.equal(applied.background, 'solid'); assert.equal(applied.color, '#abcdef');
    assert.equal(applied.body, look.settings.body); assert.equal(applied.camera, look.settings.camera);
  }
  const minimal = StreamerPresets.applyLook('minimal', current);
  assert.equal(minimal.triggerMeters, 'hide'); assert.equal(minimal.stickArrows, 'hide');
  assert.throws(() => StreamerPresets.applyLook('unknown', current));
  assert.equal(current.camera, 'custom');
});

test('capture methods export the right background and preserve all other settings without changing the editor', () => {
  const settings = StreamerSettings.normalize({ body: '#123456', camera: 'custom', pitch: 12, yaw: 25, roll: -5, background: 'solid', color: '#fedcba', highlightOpacity: 35 });
  for (const [method, chroma, background] of [['browser', 'blue', 'transparent'], ['window', 'green', 'green'], ['window', 'blue', 'blue'], ['window', 'invalid', 'green']]) {
    const exported = StreamerSettings.forOBS(settings, method, chroma);
    assert.deepEqual(exported, { ...settings, background });
    assert.deepEqual(StreamerSettings.read(new URL(StreamerSettings.url('https://example.com/streamer.html', exported)).search), exported);
  }
  assert.equal(settings.background, 'solid');
});

test('builder analytics accept bounded choices and exclude personal preset names and configuration', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  analytics.featureAction('streamer', 'look_saved', { surface: 'builder', name: 'Private saved name', settings: { body: '#123456' } });
  analytics.featureAction('streamer', 'look_selected', { surface: 'builder', look: 'neon' });
  analytics.featureAction('streamer', 'guide_method_selected', { capture_method: 'window' });
  analytics.featureAction('streamer', 'scene_preview_changed', { preview_mode: 'scene' });
  assert.deepEqual(events.find(event => event.name === 'controller_streamer_look_saved'), { name: 'controller_streamer_look_saved', surface: 'builder' });
  assert.equal(events.find(event => event.name === 'controller_streamer_look_selected').look, 'neon');
  assert.equal(events.find(event => event.name === 'controller_streamer_guide_method_selected').capture_method, 'window');
  assert.equal(events.find(event => event.name === 'controller_streamer_scene_preview_changed').preview_mode, 'scene');
  assert.equal(JSON.stringify(events).includes('Private saved name'), false);
});

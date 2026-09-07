import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ControllerAnalytics } from '../controller/analytics-service.js';
import { ControllerInput } from '../controller/input-state.js';
import { StreamerDemo } from '../controller/streamer-demo.js';
import { StreamerRotation } from '../controller/streamer-rotation.js';
import { PageAnalytics } from '../controller/page-analytics.js';

test('every named feature event in the app is accepted by the analytics filter', async () => {
  const directory = new URL('../controller/', import.meta.url);
  let checked = 0;
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.js')) continue;
    const source = await readFile(new URL(file, directory), 'utf8');
    for (const [, sourceFeature, action] of source.matchAll(/(?:featureAction|onAction)\('([a-z_]+)',\s*'([a-z_]+)'/g)) {
      const feature = file === 'appearance-view.js' ? 'appearance' : sourceFeature;
      assert.ok(Object.hasOwn(ControllerAnalytics.featureActions[feature] || {}, action), `${file}: ${feature}.${action} is silently dropped`);
      checked++;
    }
    const trackedFeature = { 'streamer-app.js': 'streamer', 'community-gallery.js': 'community_gallery', 'marble-maze-app.js': 'marble_maze' }[file];
    if (trackedFeature) for (const [, action] of source.matchAll(/\btrack\('([a-z_]+)'/g)) {
      assert.ok(Object.hasOwn(ControllerAnalytics.featureActions[trackedFeature], action), `${trackedFeature}.${action} is silently dropped`);
      checked++;
    }
  }
  assert.ok(checked > 70);
});

test('every Streamer form control has a distinct, bounded analytics setting', async () => {
  const page = await readFile(new URL('../streamer.html', import.meta.url), 'utf8');
  const html = page.match(/<form\b[^>]*id="streamer-settings"[\s\S]*?<\/form>/)?.[0];
  assert.ok(html);
  const names = new Set([...html.matchAll(/<(?:input|select)[^>]*\bname="([^"]+)"/g)].map(match => match[1]));
  for (const name of names) assert.ok(ControllerAnalytics.propertyValues.setting.includes(name), `${name} is missing from setting analytics`);
  assert.equal(names.size, 13);
});

test('highlight customization records its target, bounded opacity and previews without raw colors', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  analytics.featureAction('appearance', 'changed', { target: 'highlight', method: 'hex', color: '#ff0000' });
  analytics.featureAction('appearance', 'opacity_changed', { target: 'highlight', opacity: 0 });
  analytics.featureAction('appearance', 'opacity_changed', { target: 'highlight', opacity: 101 });
  analytics.featureAction('appearance', 'previewed', { target: 'highlight' });
  analytics.featureAction('streamer', 'highlight_previewed', { surface: 'builder' });
  assert.deepEqual(events.find(event => event.name === 'controller_appearance_changed'), { name: 'controller_appearance_changed', target: 'highlight', method: 'hex' });
  assert.deepEqual(events.filter(event => event.name === 'controller_appearance_opacity_changed'), [
    { name: 'controller_appearance_opacity_changed', target: 'highlight', opacity: 0 },
    { name: 'controller_appearance_opacity_changed', target: 'highlight' },
  ]);
  assert.deepEqual(events.find(event => event.name === 'controller_appearance_previewed'), { name: 'controller_appearance_previewed', target: 'highlight' });
  assert.deepEqual(events.find(event => event.name === 'controller_streamer_highlight_previewed'), { name: 'controller_streamer_highlight_previewed', surface: 'builder' });
});

test('Streamer settings distinguish camera, colors, opacity, meters and layout without raw colors or angles', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  for (const surface of ['builder', 'capture']) {
    analytics.streamerSettingChanged('camera', 'auto', surface);
    analytics.streamerSettingChanged('triggerMeters', 'hide', surface);
    analytics.streamerSettingChanged('highlightOpacity', 0, surface);
    analytics.streamerSettingChanged('background', 'transparent', surface);
    analytics.streamerSettingChanged('scale', 120, surface);
    analytics.streamerSettingChanged('slot', '2', surface);
    for (const setting of ['body', 'light', 'highlight', 'color']) analytics.streamerSettingChanged(setting, '#private-color', surface);
    for (const setting of ['pitch', 'yaw', 'roll']) analytics.streamerSettingChanged(setting, 73.8, surface);
  }
  const changes = events.filter(event => event.name === 'controller_streamer_settings_changed');
  assert.equal(changes.length, 26);
  assert.deepEqual(changes[0], { name: 'controller_streamer_settings_changed', surface: 'builder', setting: 'camera', camera: 'auto' });
  assert.equal(changes[1].enabled, false); assert.equal(changes[2].opacity, 0);
  assert.equal(changes[3].background, 'transparent'); assert.equal(changes[4].scale, 120); assert.equal(changes[5].selection, '2');
  for (const event of changes.filter(event => ['body', 'light', 'highlight', 'color', 'pitch', 'yaw', 'roll'].includes(event.setting))) assert.deepEqual(Object.keys(event), ['name', 'surface', 'setting']);
  assert.equal(events.filter(event => event.name === 'controller_feature_used').length, 1);
  const count = events.length; analytics.streamerSettingChanged('untrusted', 'private', 'builder'); assert.equal(events.length, count);
});

test('new event properties reject device, player, URL, motion and arbitrary values', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const privateData = { nickname: 'private', device_id: 'serial', url: 'private-link', error: 'private error', axes: [1, 2], pitch: 50, body: '#abcdef' };
  analytics.featureAction('streamer', 'camera_rotated', { ...privateData, surface: 'capture' });
  analytics.featureAction('streamer', 'settings_changed', { ...privateData, surface: 'unknown', camera: 'private', setting: 'private', opacity: 101, scale: -2, enabled: 'false' });
  analytics.featureAction('target_practice', 'paused', { ...privateData, reason: 'private reason' });
  analytics.featureAction('leaderboard', 'submit_failed', privateData);
  analytics.featureAction('gyro', 'recenter_failed', privateData);
  for (const event of events) for (const key of Object.keys(privateData)) assert.equal(Object.hasOwn(event, key), false);
  assert.deepEqual(events.find(event => event.name === 'controller_streamer_camera_rotated'), { name: 'controller_streamer_camera_rotated', surface: 'capture' });
  assert.deepEqual(events.find(event => event.name === 'controller_streamer_settings_changed'), { name: 'controller_streamer_settings_changed' });
});

test('automatic status and stop events do not invent engagement or extend active time', () => {
  let now = 0;
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }), () => now);
  for (const [feature, action, properties] of [
    ['streamer', 'opened', { surface: 'builder' }], ['streamer', 'camera_help_viewed', { surface: 'builder' }],
    ['streamer', 'input_state_changed', { status: 'waiting' }], ['streamer', 'model_loaded'], ['streamer', 'reconnect_succeeded'],
    ['target_practice', 'controller_required'], ['target_practice', 'controller_connection_changed', { connected: false }],
    ['target_practice', 'paused', { reason: 'disconnected' }], ['leaderboard', 'loaded'], ['gyro', 'recentered'],
  ]) analytics.featureAction(feature, action, properties);
  assert.equal(events.some(event => event.name === 'controller_interacted'), false);
  analytics.featureAction('streamer', 'demo_started'); now = 60000;
  analytics.featureAction('streamer', 'demo_stopped', { reason: 'completed' });
  analytics.featureAction('leaderboard', 'submit_failed'); now = 120000; analytics.pause();
  assert.deepEqual(events.filter(event => event.name === 'controller_active_time').map(event => event.seconds), [5]);
  analytics.featureAction('target_practice', 'paused', { reason: 'user' });
  assert.ok(events.some(event => event.name === 'controller_feature_used' && event.feature === 'target_practice'));
});

test('help and navigation keep only bounded topics, destinations and placements', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const privateData = { text: 'private text', url: 'https://private.test', nickname: 'private', coordinates: [1, 2] };
  analytics.featureAction('help', 'opened', { ...privateData, surface: 'builder', topic: 'obs_setup' });
  analytics.featureAction('navigation', 'clicked', { ...privateData, surface: 'studio', destination: 'streamer', placement: 'intro' });
  analytics.featureAction('navigation', 'clicked', { surface: 'private', destination: 'https://private.test', placement: 'private' });
  analytics.featureAction('help', 'opened', { topic: 'private text' });
  assert.deepEqual(events.filter(event => event.name === 'controller_help_opened'), [
    { name: 'controller_help_opened', surface: 'builder', topic: 'obs_setup' }, { name: 'controller_help_opened' },
  ]);
  assert.deepEqual(events.filter(event => event.name === 'controller_navigation_clicked'), [
    { name: 'controller_navigation_clicked', surface: 'studio', destination: 'streamer', placement: 'intro' }, { name: 'controller_navigation_clicked' },
  ]);
  for (const event of events) for (const key of Object.keys(privateData)) assert.equal(Object.hasOwn(event, key), false);
});

test('page tracking counts opened help and keyboard or middle-click navigation without changing their behavior', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const faq = new EventTarget(), link = new EventTarget();
  faq.dataset = { helpTopic: 'obs_setup' }; faq.open = false;
  link.dataset = { analyticsDestination: 'studio', analyticsPlacement: 'help' };
  const root = { querySelectorAll: selector => selector.startsWith('details') ? [faq] : [link] };
  new PageAnalytics(root, { analytics, surface: 'builder' });
  assert.equal(events.length, 0);
  for (const open of [true, false, true, false]) { faq.open = open; faq.dispatchEvent(new Event('toggle')); }
  assert.equal(events.filter(event => event.name === 'controller_help_opened').length, 2);
  for (const [type, button] of [['click', 0], ['auxclick', 1], ['auxclick', 2]]) {
    const event = new Event(type, { cancelable: true });
    event.button = button;
    link.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  }
  assert.deepEqual(events.filter(event => event.name === 'controller_navigation_clicked'), [
    { name: 'controller_navigation_clicked', surface: 'builder', destination: 'studio', placement: 'help' },
    { name: 'controller_navigation_clicked', surface: 'builder', destination: 'studio', placement: 'help' },
  ]);
  PageAnalytics.trackLink(link, () => { throw new Error('Tracking blocked'); });
  assert.equal(link.dispatchEvent(new Event('click', { cancelable: true })), true);
});

test('all static FAQ topics and navigation tags are accepted by the event contract', async () => {
  for (const page of ['index.html', 'streamer.html']) {
    const html = await readFile(new URL('../' + page, import.meta.url), 'utf8');
    const faqs = [...html.matchAll(/<details data-help-topic="([^"]+)"><summary>/g)];
    assert.equal(faqs.length, 6, `${page}: each FAQ needs a topic`);
    for (const [, topic] of html.matchAll(/data-help-topic="([^"]+)"/g)) assert.ok(ControllerAnalytics.propertyValues.topic.includes(topic), topic);
    for (const [, destination] of html.matchAll(/data-analytics-destination="([^"]+)"/g)) assert.ok(ControllerAnalytics.propertyValues.destination.includes(destination), destination);
    for (const [, placement] of html.matchAll(/data-analytics-placement="([^"]+)"/g)) assert.ok(ControllerAnalytics.propertyValues.placement.includes(placement), placement);
  }
});

test('Auto camera tooltip exposure is once per visit and cannot create or extend engagement', () => {
  let now = 0;
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }), () => now);
  analytics.featureAction('streamer', 'opened', { surface: 'builder' });
  for (let i = 0; i < 100; i++) {
    now += 1000;
    analytics.featureAction('streamer', 'camera_help_viewed', { surface: 'builder' });
  }
  analytics.flush();
  assert.deepEqual(events.map(event => event.name), ['controller_streamer_opened', 'controller_streamer_camera_help_viewed']);
  analytics.featureAction('streamer', 'tab_selected', { surface: 'builder', tab: 'inputs' });
  now += 60000;
  analytics.featureAction('streamer', 'camera_help_viewed', { surface: 'builder' });
  now += 60000; analytics.flush();
  assert.deepEqual(events.filter(event => event.name === 'controller_active_time').map(event => event.seconds), [5]);
});

test('preview completion, user stop and live-controller takeover each emit one correct outcome', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const demo = new StreamerDemo(new ControllerInput(), { now: () => 0, onChange: (active, reason) => analytics.featureAction('streamer', active ? 'demo_started' : 'demo_stopped', { reason, surface: 'builder' }) });
  demo.start(); demo.update(6000); demo.update(7000); demo.stop();
  demo.start(); demo.stop(); demo.stop();
  demo.start({ loop: true }); demo.update(20, { liveInput: true }); demo.update(40, { liveInput: true });
  assert.deepEqual(events.filter(event => event.name === 'controller_streamer_demo_stopped').map(event => event.reason), ['completed', 'user', 'live_input']);
  assert.equal(events.filter(event => event.name === 'controller_streamer_demo_started').length, 3);
});

test('a rotation counts one committed gesture, not its pointer movements or a simple click', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const rotation = new StreamerRotation({ onChange() {}, onCommit: () => analytics.featureAction('streamer', 'camera_rotated', { surface: 'builder' }) });
  rotation.start(1, 0, 0, { x: 0, y: 0, z: 0 }, 500); rotation.end(1);
  assert.equal(events.length, 0);
  rotation.start(2, 0, 0, { x: 0, y: 0, z: 0 }, 500);
  for (let i = 1; i < 100; i++) rotation.move(2, i * 2, i);
  assert.equal(events.length, 0);
  rotation.end(2); rotation.end(2);
  assert.equal(events.filter(event => event.name === 'controller_streamer_camera_rotated').length, 1);
});

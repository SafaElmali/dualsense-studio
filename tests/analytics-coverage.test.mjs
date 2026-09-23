import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { ControllerAnalytics } from '../controller/analytics-service.js';
import { ControllerInput } from '../controller/input-state.js';


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
    const trackedFeature = {
'marble-maze-app.js': 'marble_maze',
'jev-arena-app.js': 'jev_arena'
}[file];
    if (trackedFeature) for (const [, action] of source.matchAll(/\btrack\('([a-z_]+)'/g)) {
      assert.ok(Object.hasOwn(ControllerAnalytics.featureActions[trackedFeature], action), `${trackedFeature}.${action} is silently dropped`);
      checked++;
    }
  }
  assert.ok(checked > 70);
});



test('highlight customization records its target, bounded opacity and previews without raw colors', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  analytics.featureAction('appearance', 'changed', { target: 'highlight', method: 'hex', color: '#ff0000' });
  analytics.featureAction('appearance', 'opacity_changed', { target: 'highlight', opacity: 0 });
  analytics.featureAction('appearance', 'opacity_changed', { target: 'highlight', opacity: 101 });
  analytics.featureAction('appearance', 'previewed', { target: 'highlight' });
  
  assert.deepEqual(events.find(event => event.name === 'controller_appearance_changed'), { name: 'controller_appearance_changed', target: 'highlight', method: 'hex' });
  assert.deepEqual(events.filter(event => event.name === 'controller_appearance_opacity_changed'), [
    { name: 'controller_appearance_opacity_changed', target: 'highlight', opacity: 0 },
    { name: 'controller_appearance_opacity_changed', target: 'highlight' },
  ]);
  assert.deepEqual(events.find(event => event.name === 'controller_appearance_previewed'), { name: 'controller_appearance_previewed', target: 'highlight' });
  
});



test('new event properties reject device, player, URL, motion and arbitrary values', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const privateData = { nickname: 'private', device_id: 'serial', url: 'private-link', error: 'private error', axes: [1, 2], pitch: 50, body: '#abcdef' };
  
  
  analytics.featureAction('target_practice', 'paused', { ...privateData, reason: 'private reason' });
  analytics.featureAction('leaderboard', 'submit_failed', privateData);
  analytics.featureAction('gyro', 'recenter_failed', privateData);
  for (const event of events) for (const key of Object.keys(privateData)) assert.equal(Object.hasOwn(event, key), false);
  
  
});





test('page tracking counts opened help and keyboard or middle-click navigation without changing their behavior', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  const faq = new EventTarget(), link = new EventTarget();
  faq.dataset = { helpTopic: 'obs_setup' }; faq.open = false;
  link.dataset = { analyticsDestination: 'studio', analyticsPlacement: 'help' };
  const root = { querySelectorAll: selector => selector.startsWith('details') ? [faq] : [link] };
  new PageAnalytics(root, { analytics, surface: 'studio' });
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
    { name: 'controller_navigation_clicked', surface: 'studio', destination: 'studio', placement: 'help' },
    { name: 'controller_navigation_clicked', surface: 'studio', destination: 'studio', placement: 'help' },
  ]);
  PageAnalytics.trackLink(link, () => { throw new Error('Tracking blocked'); });
  assert.equal(link.dispatchEvent(new Event('click', { cancelable: true })), true);
});

test('all static FAQ topics and navigation tags are accepted by the event contract', async () => {
  for (const page of ['index.html']) {
    const html = await readFile(new URL('../' + page, import.meta.url), 'utf8');
    const faqs = [...html.matchAll(/<details data-help-topic="([^"]+)"><summary>/g)];
    assert.equal(faqs.length, 6, `${page}: each FAQ needs a topic`);
    for (const [, topic] of html.matchAll(/data-help-topic="([^"]+)"/g)) assert.ok(ControllerAnalytics.propertyValues.topic.includes(topic), topic);
    for (const [, destination] of html.matchAll(/data-analytics-destination="([^"]+)"/g)) assert.ok(ControllerAnalytics.propertyValues.destination.includes(destination), destination);
    for (const [, placement] of html.matchAll(/data-analytics-placement="([^"]+)"/g)) assert.ok(ControllerAnalytics.propertyValues.placement.includes(placement), placement);
  }
});







test('Jev event properties are bounded and discard credentials, state, and raw errors', () => {
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }));
  analytics.featureAction('jev_arena', 'request_failed', { game: 'super-tilt-bro', player_mode: 'human-jev', error_kind: 'timeout', api_key: 'secret', token: 'secret', state: { players: [] }, error: 'private response' });
  assert.deepEqual(events, [{ name: 'controller_jev_arena_request_failed', game: 'super-tilt-bro', player_mode: 'human-jev', error_kind: 'timeout' }]);
  analytics.featureAction('jev_arena', 'request_failed', { game: 'private ROM', player_mode: 'private', error_kind: 'private error' });
  assert.deepEqual(events.at(-1), { name: 'controller_jev_arena_request_failed' });
});

test('automatic Jev lifecycle events do not fabricate engagement or extend active time', () => {
  let now = 0;
  const events = [], analytics = new ControllerAnalytics((name, properties) => events.push({ name, ...properties }), () => now);
  for (const action of ['opened', 'started', 'load_failed', 'completed', 'connected', 'unavailable', 'connect_failed', 'inference_started', 'request_failed']) analytics.featureAction('jev_arena', action);
  analytics.featureAction('jev_arena', 'paused', { pause_reason: 'page_blur' });
  assert.ok(!events.some(event => event.name === 'controller_interacted'));
  analytics.featureAction('jev_arena', 'load_requested', { game: 'table-tennis', player_mode: 'human-jev' });
  assert.equal(events.filter(event => event.name === 'controller_feature_used').length, 1);
  now = 60000; analytics.featureAction('jev_arena', 'inference_started'); analytics.flush();
  assert.equal(events.find(event => event.name === 'controller_active_time').seconds, 5);
});

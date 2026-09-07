import test from 'node:test';
import assert from 'node:assert/strict';
import { CommunityShareView } from '../controller/community-share-view.js';
import { StreamerSettings } from '../controller/streamer-settings.js';

function fixture(t, submit) {
  class Element {
    constructor() { this.listeners = new Map(); this.disabled = false; this.textContent = ''; }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    emit(name) { return this.listeners.get(name)?.({ preventDefault() {} }); }
  }
  const elements = Object.fromEntries(['community-share-dialog', 'community-share-status', 'share-community-look', 'form', 'submit', 'close'].map(id => [id, new Element()]));
  const dialog = elements['community-share-dialog'], form = elements.form;
  dialog.showModal = () => { dialog.open = true; }; dialog.close = () => { dialog.open = false; };
  dialog.querySelector = selector => selector === 'form' ? form : elements.close;
  form.querySelector = () => elements.submit; form.reset = () => { form.resets = (form.resets || 0) + 1; };
  form.values = { name: 'Night sky', creator: 'Safa', consent: 'on', website: '' };
  const original = globalThis.FormData;
  globalThis.FormData = class { constructor(form) { this.values = { ...form.values }; } get(key) { return this.values[key]; } has(key) { return Object.hasOwn(this.values, key); } };
  t.after(() => { globalThis.FormData = original; });
  const settings = { ...StreamerSettings.defaults }, actions = [];
  new CommunityShareView({ getElementById: id => elements[id] }, { getSettings: () => settings, client: { submit }, onAction: action => actions.push(action) });
  return { elements, dialog, form, settings, actions };
}

test('sharing captures the selected look at open, prevents double sends, and reports the pending review state', async t => {
  let complete, body;
  const { elements, dialog, form, settings, actions } = fixture(t, data => { body = data; return new Promise(resolve => { complete = resolve; }); });
  elements['share-community-look'].emit('click'); assert.equal(dialog.open, true);
  const original = settings.body; settings.body = '#000000';
  const pending = form.emit('submit');
  assert.equal(body.settings.body, original); assert.equal(body.consent, true);
  assert.equal(elements.submit.disabled, true); assert.equal(elements['share-community-look'].disabled, true);
  await form.emit('submit'); assert.equal(actions.filter(action => action === 'submit_requested').length, 1);
  complete({ received: true }); await pending;
  assert.match(elements['community-share-status'].textContent, /after review/);
  assert.equal(form.resets, 1); assert.equal(elements.submit.disabled, false);
});

test('failed submissions retain form input, re-enable sharing, and can be retried', async t => {
  let calls = 0;
  const { elements, form, actions } = fixture(t, async () => { if (++calls === 1) throw new Error('Please try again.'); return { received: true }; });
  elements['share-community-look'].emit('click'); await form.emit('submit');
  assert.equal(elements['community-share-status'].textContent, 'Please try again.');
  assert.equal(form.resets, undefined); assert.equal(elements.submit.disabled, false);
  assert.equal(elements['share-community-look'].disabled, false);
  await form.emit('submit'); assert.equal(form.resets, 1); assert.ok(actions.includes('submit_failed')); assert.ok(actions.includes('submitted'));
});

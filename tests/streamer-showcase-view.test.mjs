import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamerShowcaseView } from '../controller/streamer-showcase.js';

function fixture(t, channels) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
  t.after(() => original ? Object.defineProperty(globalThis, 'document', original) : delete globalThis.document);
  class Element extends EventTarget {
    constructor(tag = 'span') { super(); this.tag = tag; this.children = []; this.attributes = {}; this.textContent = ''; }
    append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute(key, value) { this.attributes[key] = value; }
    remove() { this.parent.children = this.parent.children.filter(child => child !== this); }
  }
  const elements = new Map();
  const root = { querySelector: selector => { if (!elements.has(selector)) elements.set(selector, new Element()); return elements.get(selector); } };
  globalThis.document = { createElement: tag => new Element(tag) };
  const links = [], actions = [];
  const view = Object.assign(Object.create(StreamerShowcaseView.prototype), {
    root, client: { list: async () => channels }, trackLink: (link, callback) => links.push({ link, callback }), onAction: (...args) => actions.push(args),
  });
  return { view, root, links, actions };
}

test('cards render profile identity and bio as text, preserve the link, and reveal initials after image errors', async t => {
  const profile = { displayName: '<b>Platform Name</b>', description: '<img src=x onerror=alert(1)>', avatarUrl: 'https://files.kick.com/avatar.webp' };
  const { view, root, links, actions } = fixture(t, [{ name: 'Submitted', channelUrl: 'https://kick.com/testchannel', profile }]);
  await view.load();
  const list = root.querySelector('[data-showcase-list]'); assert.equal(list.hidden, false);
  const [link] = list.children[0].children;
  assert.equal(link.href, 'https://kick.com/testchannel'); assert.equal(link.target, '_blank'); assert.equal(link.rel, 'noopener noreferrer');
  const [identity, bio, action] = link.children;
  const [avatar, details] = identity.children;
  assert.equal(details.children[0].textContent, profile.displayName); assert.equal(details.children[1].textContent, 'Kick');
  assert.equal(bio.tag, 'p'); assert.equal(bio.textContent, profile.description); assert.equal(bio.children.length, 0);
  assert.equal(action.textContent, 'Visit channel ↗');
  const [image] = avatar.children;
  assert.equal(image.src, profile.avatarUrl); assert.equal(image.alt, ''); assert.equal(image.loading, 'lazy');
  assert.equal(image.referrerPolicy, 'no-referrer'); assert.equal(avatar.attributes['aria-hidden'], 'true');
  image.dispatchEvent(new Event('error')); assert.equal(avatar.children.length, 0); assert.equal(avatar.textContent, '<');
  links[0].callback(); assert.deepEqual(actions.at(-1), ['channel_opened', { platform: 'Kick' }]);
});

test('legacy channels and empty bios remain complete cards without broken or placeholder images', async t => {
  const { view, links } = fixture(t, [
    { name: 'Safa', channelUrl: 'https://twitch.tv/safaelmali' },
    { name: 'Video Channel', channelUrl: 'https://youtube.com/@videochannel', profile: { displayName: '', description: '' } },
  ]);
  await view.load();
  for (const { link } of links) {
    assert.equal(link.children.length, 2);
    const [avatar, details] = link.children[0].children;
    assert.equal(avatar.children.length, 0); assert.equal(avatar.textContent, details.children[0].textContent[0]);
  }
});

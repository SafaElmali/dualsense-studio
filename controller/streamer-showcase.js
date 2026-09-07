import { StreamerChannel, ChannelError } from './streamer-channel.js';

export class StreamerShowcaseClient {
  constructor(fetcher = (...args) => fetch(...args)) { this.fetcher = fetcher; }

  async request(body) {
    let response;
    try {
      response = await this.fetcher('/.netlify/functions/streamers', {
        method: body ? 'POST' : 'GET',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(12000),
      });
    } catch { throw new Error('Could not reach the showcase. Check your connection and try again.'); }
    // Edge rate limits may return a plain-text response before the function runs.
    if (response.status === 429) throw new Error('Too many requests. Please wait a little and try again.');
    if (!response.headers.get('content-type')?.includes('application/json') || response.status === 404) {
      throw new Error('The showcase is not available here yet. Please try again later or reach out to @SafaElmali on X.');
    }
    let data;
    try { data = await response.json(); } catch { throw new Error('Could not load the showcase. Please try again.'); }
    if (!response.ok) throw new ChannelError(data?.error || 'Please try again later.', data?.field || '');
    return data;
  }

  async list() {
    const data = await this.request();
    if (!Array.isArray(data?.channels)) throw new Error('Could not load the showcase. Please try again.');
    return data.channels.map(channel => ({ ...StreamerChannel.normalize(channel), ...(channel.profile ? { profile: StreamerChannel.profile(channel.profile) } : {}) }));
  }

  async submit(body) {
    const data = await this.request(body);
    if (data?.received !== true) throw new Error('Your submission was not confirmed. Please try again.');
  }
}

export class StreamerShowcaseView {
  constructor(root, { client = new StreamerShowcaseClient(), onAction = () => {}, trackLink = () => {} } = {}) {
    this.root = root; this.client = client; this.onAction = onAction; this.trackLink = trackLink;
    this.form = root.querySelector('form');
    this.toggle = root.querySelector('[data-showcase-toggle]');
    this.dialog = root.querySelector('[data-showcase-dialog]');
    this.toggle.addEventListener('click', () => {
      this.dialog.showModal();
      this.onAction('form_opened');
    });
    root.querySelector('[data-showcase-close]').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('click', event => {
      if (event.target !== this.dialog) return;
      const bounds = this.dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.dialog.close();
    });
    this.form.addEventListener('submit', event => { event.preventDefault(); void this.submit(); });
    this.form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
    root.querySelector('[data-showcase-retry]').addEventListener('click', () => { void this.load(); });
    void this.load();
  }

  async load() {
    if (this.loading) return;
    this.loading = true;
    const status = this.root.querySelector('[data-showcase-status]');
    const retry = this.root.querySelector('[data-showcase-retry]');
    status.textContent = 'Loading featured channels…'; retry.hidden = true;
    try {
      const channels = await this.client.list();
      const list = this.root.querySelector('[data-showcase-list]');
      list.replaceChildren();
      for (const channel of channels) {
        const platform = StreamerChannel.platform(channel.channelUrl);
        const card = document.createElement('li');
        const link = document.createElement('a');
        link.href = channel.channelUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
        const badge = document.createElement('span');
        badge.className = 'showcase-platform'; badge.textContent = platform;
        const displayName = channel.profile?.displayName || channel.name;
        const identity = document.createElement('span'); identity.className = 'showcase-identity';
        const avatar = document.createElement('span'); avatar.className = 'showcase-avatar'; avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = Array.from(displayName)[0].toLocaleUpperCase();
        if (channel.profile?.avatarUrl) {
          const image = document.createElement('img'); image.alt = ''; image.width = 56; image.height = 56;
          image.loading = 'lazy'; image.decoding = 'async'; image.referrerPolicy = 'no-referrer';
          image.addEventListener('error', () => image.remove(), { once: true });
          image.src = channel.profile.avatarUrl; avatar.append(image);
        }
        const details = document.createElement('span'); details.className = 'showcase-details';
        const name = document.createElement('strong'); name.textContent = displayName;
        details.append(name, badge); identity.append(avatar, details);
        const action = document.createElement('span'); action.className = 'showcase-visit'; action.textContent = 'Visit channel ↗';
        link.append(identity);
        if (channel.profile?.description) {
          const bio = document.createElement('p'); bio.className = 'showcase-bio'; bio.textContent = channel.profile.description;
          link.append(bio);
        }
        link.append(action); card.append(link); list.append(card);
        this.trackLink(link, () => this.onAction('channel_opened', { platform }));
      }
      list.hidden = !channels.length;
      this.root.querySelector('[data-showcase-empty]').hidden = !!channels.length;
      status.textContent = '';
      this.onAction('loaded');
    } catch (error) {
      this.root.querySelector('[data-showcase-empty]').hidden = true;
      status.textContent = error.message; retry.hidden = false;
      this.onAction('load_failed');
    } finally { this.loading = false; }
  }

  async submit() {
    if (this.submitting) return;
    const status = this.root.querySelector('[data-showcase-submit-status]');
    let channel;
    try {
      channel = StreamerChannel.normalize({ name: this.form.elements.name.value, channelUrl: this.form.elements.channelUrl.value });
    } catch (error) {
      status.textContent = error.message;
      const field = this.form.elements[error.field];
      field?.setAttribute('aria-invalid', 'true'); field?.focus(); return;
    }
    if (!this.form.elements.consent.checked) { this.form.elements.consent.reportValidity(); return; }
    const properties = { platform: StreamerChannel.platform(channel.channelUrl) };
    this.submitting = true;
    const button = this.form.querySelector('button[type="submit"]');
    button.disabled = true; button.textContent = 'Sending…'; status.textContent = '';
    this.onAction('submit_requested', properties);
    try {
      await this.client.submit({ ...channel, consent: true, website: this.form.elements.website.value });
      this.form.reset();
      status.textContent = 'Thanks! Your channel is with us. Approved channels will appear here. For updates, reach out to @SafaElmali on X.';
      if (this.dialog.open) status.focus();
      this.onAction('submitted', properties);
    } catch (error) {
      status.textContent = error.message;
      const field = this.form.elements[error.field];
      field?.setAttribute('aria-invalid', 'true'); field?.focus();
      this.onAction('submit_failed', properties);
    } finally { this.submitting = false; button.disabled = false; button.textContent = 'Submit for review'; }
  }
}

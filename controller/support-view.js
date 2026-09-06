export class SupportView {
  static destination(value, provider) {
    try {
      const url = new URL(value);
      const host = provider === 'patreon' ? 'patreon.com' : provider === 'buymeacoffee' ? 'buymeacoffee.com' : null;
      const path = provider === 'patreon' ? /^\/(?:c\/)?[\w-]+\/?$/ : /^\/[\w-]+\/?$/;
      if (!host || url.protocol !== 'https:' || ![host, 'www.' + host].includes(url.hostname)) return null;
      if (url.username || url.password || url.port || !path.test(url.pathname)) return null;
      if (['create', 'login', 'signup', 'pricing', 'settings', 'home', 'dashboard', 'about', 'faq', 'terms', 'privacy-policy'].includes(url.pathname.split('/')[1])) return null;
      url.search = '';
      url.hash = '';
      return url.href;
    } catch { return null; }
  }

  constructor(root, { urls, onOpen = () => {} }) {
    if (!root) return;
    root.hidden = true;
    for (const option of root.querySelectorAll('[data-support-provider]')) {
      const provider = option.dataset.supportProvider;
      const link = option.querySelector('[data-support-link]');
      const destination = SupportView.destination(urls[provider], provider);
      option.hidden = !destination;
      if (!destination) continue;
      root.hidden = false;
      link.href = destination;
      const track = event => {
        if (event.type === 'auxclick' && event.button !== 1) return;
        try { onOpen(provider); } catch { /* A tracking failure must never block the link. */ }
      };
      link.addEventListener('click', track);
      link.addEventListener('auxclick', track);
    }
  }
}

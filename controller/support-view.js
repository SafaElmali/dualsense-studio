export class SupportView {
  static destination(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || !['patreon.com', 'www.patreon.com'].includes(url.hostname)) return null;
      if (url.username || url.password || url.port || !/^\/(?:c\/)?[\w-]+\/?$/.test(url.pathname)) return null;
      if (['create', 'login', 'signup', 'pricing', 'settings', 'home'].includes(url.pathname.split('/')[1])) return null;
      url.search = '';
      url.hash = '';
      return url.href;
    } catch { return null; }
  }

  constructor(root, { url, onOpen = () => {} }) {
    if (!root) return;
    const link = root.querySelector('[data-support-link]');
    const destination = SupportView.destination(url);
    root.hidden = !destination;
    if (!destination) return;
    link.href = destination;
    const track = event => {
      if (event.type === 'auxclick' && event.button !== 1) return;
      try { onOpen(); } catch { /* A tracking failure must never block the link. */ }
    };
    link.addEventListener('click', track);
    link.addEventListener('auxclick', track);
  }
}

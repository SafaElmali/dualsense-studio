// Optional reporting must never be a dependency of controller startup.
// Keep the original analytics URLs so content blockers can still block them.
export class AppEvents {
  constructor({
    loadAnalytics = () => import('./analytics.js?v=controller-20s-v2'),
    loadPage = () => import('./page-analytics.js'),
  } = {}) {
    this.pending = [];
    this.state = 'loading';
    this.ready = Promise.resolve().then(loadAnalytics).then(({ analytics }) => {
      this.client = analytics;
      this.state = 'ready';
      for (const [method, args] of this.pending.splice(0)) this.send(method, args);
    }).catch(() => { this.state = 'disabled'; this.pending.length = 0; });
    this.pageReady = Promise.resolve().then(loadPage).catch(() => null);
  }

  send(method, args) {
    if (this.state === 'loading') {
      if (this.pending.length < 100) this.pending.push([method, args]);
      return;
    }
    try { this.client?.[method](...args); } catch { /* Reporting cannot interrupt the app. */ }
  }

  once(...args) { this.send('once', args); }
  interact(...args) { this.send('interact', args); }
  finish(...args) { this.send('finish', args); }
  featureAction(...args) { this.send('featureAction', args); }
  streamerSettingChanged(...args) { this.send('streamerSettingChanged', args); }

  trackPage(root, surface) {
    void this.pageReady.then(module => {
      if (module) new module.PageAnalytics(root, { analytics: this, surface });
    }).catch(() => {});
  }

  trackLink(link, onOpen) {
    void this.pageReady.then(module => module?.PageAnalytics.trackLink(link, onOpen)).catch(() => {});
  }
}

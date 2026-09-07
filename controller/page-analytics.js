// Shared tracking for explicit help and navigation actions on the studio pages.
export class PageAnalytics {
  static trackLink(link, onOpen) {
    const track = event => {
      if (event.type === 'auxclick' && event.button !== 1) return;
      try { onOpen(); } catch { /* Tracking must never block navigation. */ }
    };
    link.addEventListener('click', track);
    link.addEventListener('auxclick', track);
  }

  constructor(root, { analytics, surface }) {
    for (const link of root.querySelectorAll('[data-analytics-destination]')) {
      PageAnalytics.trackLink(link, () => analytics.featureAction('navigation', 'clicked', {
        surface, destination: link.dataset.analyticsDestination, placement: link.dataset.analyticsPlacement,
      }));
    }
    for (const details of root.querySelectorAll('details[data-help-topic]')) {
      details.addEventListener('toggle', () => {
        if (details.open) analytics.featureAction('help', 'opened', { surface, topic: details.dataset.helpTopic });
      });
    }
  }
}

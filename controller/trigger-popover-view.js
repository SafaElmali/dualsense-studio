export class TriggerPopoverView {
  constructor() {
    this.button = document.getElementById('open-trigger-panel');
    this.panel = document.getElementById('trigger-panel');
    this.place = this.place.bind(this);
    this.panel.addEventListener('toggle', event => {
      this.button.setAttribute('aria-expanded', String(event.newState === 'open'));
      if (event.newState === 'open') {
        this.place();
        const selected = this.panel.querySelector('input[name="trigger-mode"]:checked');
        selected?.scrollIntoView({ block: 'nearest' });
        selected?.focus({ preventScroll: true });
      }
    });
    this.panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') event.stopPropagation();
    });
    document.addEventListener('focusin', event => {
      if (!this.panel.contains(event.target) && !this.button.contains(event.target)) this.panel.hidePopover();
    });
    this.openLinkedPanel = () => {
      if (location.hash === '#trigger-effects-title') this.open();
    };
    window.addEventListener('hashchange', this.openLinkedPanel);
    window.addEventListener('resize', this.place);
    window.addEventListener('scroll', this.place, { passive: true });
    window.visualViewport?.addEventListener('resize', this.place);
    window.visualViewport?.addEventListener('scroll', this.place);
    this.openLinkedPanel();
  }

  place() {
    if (!this.panel.matches(':popover-open')) return;
    const viewport = window.visualViewport;
    const left = (viewport?.offsetLeft || 0) + 12;
    const top = (viewport?.offsetTop || 0) + 12;
    const right = left + (viewport?.width || window.innerWidth) - 24;
    const bottom = top + (viewport?.height || window.innerHeight) - 24;
    const anchor = this.button.getBoundingClientRect();
    // A dropdown should travel with its control, rather than float over unrelated content.
    if (anchor.bottom < top || anchor.top > bottom) { this.panel.hidePopover(); return; }
    const below = bottom - anchor.bottom - 8;
    const above = anchor.top - top - 8;
    const compact = Math.max(below, above) < 300;
    const opensAbove = below < 300 && above > below;
    this.panel.style.maxHeight = `${Math.min(600, compact ? bottom - top : opensAbove ? above : below)}px`;
    this.panel.style.left = `${Math.max(left, Math.min(anchor.left, right - this.panel.offsetWidth))}px`;
    this.panel.style.top = `${compact ? top : opensAbove ? anchor.top - 8 - this.panel.offsetHeight : anchor.bottom + 8}px`;
  }

  open() {
    this.button.scrollIntoView({ block: 'nearest' });
    this.button.focus({ preventScroll: true });
    this.panel.showPopover();
    this.place();
  }
}

// Shared by the renderer, appearance controls, and portable OBS settings.
export class StickArrowSettings {
  static defaults = Object.freeze({ stickArrows: 'show', arrowSize: 100, arrowColor: 'auto' });

  static normalize(values = {}) {
    const result = { ...this.defaults };
    if (['show', 'hide'].includes(values.stickArrows)) result.stickArrows = values.stickArrows;
    const size = String(values.arrowSize ?? '').trim();
    if (size !== '' && Number.isFinite(Number(size))) result.arrowSize = Math.round(Math.max(50, Math.min(150, Number(size))));
    if (/^#[\da-f]{6}$/i.test(values.arrowColor)) result.arrowColor = values.arrowColor.toLowerCase();
    return result;
  }
}

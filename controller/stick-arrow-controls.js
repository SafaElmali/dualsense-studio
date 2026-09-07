import { StickArrowSettings } from './stick-arrow-settings.js';

export class StickArrowControls {
  constructor(root, { onInput = () => {}, onChange = () => {}, onPreview = () => {} } = {}) {
    this.root = root;
    const id = root.id;
    root.classList.add('stick-arrow-controls');
    root.innerHTML = `
      <label class="arrow-switch">Show stick arrows<input data-arrow="stickArrows" type="checkbox" role="switch" checked></label>
      <fieldset class="arrow-options">
        <label class="arrow-size-label" for="${id}-size">Arrow size<output for="${id}-size">100%</output></label>
        <input id="${id}-size" data-arrow="arrowSize" type="range" min="50" max="150" step="1" value="100">
        <label class="arrow-auto">Automatic contrast<input data-arrow="auto" type="checkbox" checked></label>
        <div class="arrow-color-row"><label>Arrow color<input data-arrow="color" type="color" value="#ffffff" aria-label="Arrow color"></label><input data-arrow="hex" type="text" aria-label="Arrow hex color" aria-describedby="${id}-error" value="#FFFFFF" maxlength="7" spellcheck="false" autocomplete="off"></div>
        <p id="${id}-error" class="arrow-error" role="status"></p>
        <button type="button" class="arrow-preview">Preview arrows <span aria-hidden="true">↗</span></button>
      </fieldset>
      <p class="arrow-note">Arrows appear as the sticks move. Hiding them keeps stick highlighting on.</p>`;
    for (const type of ['input', 'change']) root.addEventListener(type, event => {
      event.stopPropagation();
      const field = event.target.dataset.arrow;
      if (!field) return;
      const hex = this.field('hex');
      if (field === 'hex') {
        const valid = /^#?[\da-f]{6}$/i.test(hex.value.trim());
        hex.setAttribute('aria-invalid', String(!valid));
        root.querySelector('.arrow-error').textContent = valid ? '' : 'Use a six-digit hex color, like #52E2B1.';
        if (!valid) return;
        this.field('color').value = '#' + hex.value.trim().replace('#', '');
      }
      if (['color', 'hex'].includes(field)) this.field('auto').checked = false;
      const value = this.read();
      this.render(value);
      const setting = ['auto', 'color', 'hex'].includes(field) ? 'arrowColor' : field;
      if (type === 'input') onInput(value, setting);
      else onChange(value, setting);
    });
    root.querySelector('.arrow-preview').addEventListener('click', onPreview);
    this.render(StickArrowSettings.defaults);
  }

  field(name) { return this.root.querySelector(`[data-arrow="${name}"]`); }

  read() {
    return StickArrowSettings.normalize({ stickArrows: this.field('stickArrows').checked ? 'show' : 'hide', arrowSize: this.field('arrowSize').value, arrowColor: this.field('auto').checked ? 'auto' : this.field('color').value });
  }

  render(values) {
    const settings = StickArrowSettings.normalize(values);
    this.field('stickArrows').checked = settings.stickArrows === 'show';
    this.field('arrowSize').value = settings.arrowSize;
    this.root.querySelector('output').value = `${settings.arrowSize}%`;
    this.field('auto').checked = settings.arrowColor === 'auto';
    if (settings.arrowColor !== 'auto') this.field('color').value = settings.arrowColor;
    this.field('hex').value = this.field('color').value.toUpperCase();
    this.field('hex').removeAttribute('aria-invalid');
    this.root.querySelector('.arrow-error').textContent = '';
    this.root.querySelector('.arrow-options').disabled = settings.stickArrows === 'hide';
  }
}

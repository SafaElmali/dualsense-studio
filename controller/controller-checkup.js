export class ControllerCheckup {
  static steps = [
    { id: 'buttons', title: 'Buttons', instruction: 'Press and release each required button. Each completed input lights up below.' },
    { id: 'sticks', title: 'Sticks', instruction: 'Measure the resting sticks, then start a sweep and slowly rotate both sticks around their full outer edge.' },
    { id: 'triggers', title: 'Trigger travel', instruction: 'Release L2 and R2, squeeze each all the way, then release them again.' },
    { id: 'touchpad', title: 'Touchpad', instruction: 'Move a finger across the touchpad, touch with two fingers together, then click it.' },
    { id: 'motion', title: 'Motion', instruction: 'Tilt and rotate the controller in each direction. Watch all three motion bars respond.' },
    { id: 'resistance', title: 'Trigger resistance', instruction: 'Start the three-second test, then gently squeeze L2 and R2. Confirm whether you feel resistance in both.' },
    { id: 'lights', title: 'Lightbar', instruction: 'Start the test and watch the lightbar cycle red, green, and blue. Your selected color returns afterward.' },
    { id: 'vibration', title: 'Vibration', instruction: 'Start the test. Feel for a short vibration in the left grip, then the right grip.' },
    { id: 'speaker', title: 'Speaker', instruction: 'Connect by USB, unplug headphones, and start the brief tone. Confirm whether you hear it from the controller.' },
  ];
  constructor() { this.reset(); }
  reset() {
    this.index = 0; this.results = {}; this.attempted = new Set();
    this.touch = { moved: false, two: false, click: false }; this.previousTouch = null;
    this.motion = [false, false, false];
  }
  get step() { return ControllerCheckup.steps[this.index]; }
  get complete() { return ControllerCheckup.steps.every(step => this.results[step.id]); }
  static isOptionalButton(pad, index) { return pad?.mapping === 'standard' && index === 16; }
  select(index) { if (Number.isInteger(index) && index >= 0 && index < ControllerCheckup.steps.length) this.index = index; }
  mark(result) {
    if (!['observed', 'confirmed', 'issue', 'skipped'].includes(result)) return;
    this.results[this.step.id] = result;
  }
  sample(model, pad, sensors) {
    if (!pad) return;
    if (sensors) {
      const contacts = sensors.contacts;
      this.touch.two ||= contacts.length >= 2;
      this.touch.click ||= (pad.buttons[17]?.value ?? 0) > .5;
      const current = contacts[0];
      if (current && this.previousTouch?.id === current.id) {
        this.touch.moved ||= Math.hypot(current.x - this.previousTouch.x, current.y - this.previousTouch.y) > .08;
      }
      if (!current || !this.previousTouch || this.previousTouch.id !== current.id || this.touch.moved) this.previousTouch = current ?? null;
      sensors.rates.forEach((rate, index) => { this.motion[index] ||= Math.abs(rate) > 15; });
    }
    const observed = {
      buttons: model.buttons.length > 0 && model.buttons.every((button, index) => button.released || ControllerCheckup.isOptionalButton(pad, index)),
      sticks: !!model.center && [0, 1].every(side => model.circularity(side).coverage === 1),
      triggers: pad.mapping === 'standard' && model.travel.every((travel, i) => travel.min <= .05 && travel.max >= .95 && model.values[6 + i] <= .05),
      touchpad: Object.values(this.touch).every(Boolean),
      motion: this.motion.every(Boolean),
    };
    for (const [id, value] of Object.entries(observed)) {
      if (value && !this.results[id]) this.results[id] = 'observed';
    }
  }
  snapshot(model, pad) {
    return ControllerCheckup.steps.map(step => {
      const row = { title: step.title, result: this.results[step.id] || 'untested' };
      if (step.id === 'buttons' && model?.buttons[16] && ControllerCheckup.isOptionalButton(pad, 16)) {
        row.note = model.buttons[16].released ? 'Home observed (optional)' : 'Home not tested (optional)';
      }
      return row;
    });
  }
}

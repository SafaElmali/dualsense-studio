import { StreamerPresets } from './streamer-presets.js';
import { StreamerSettings } from './streamer-settings.js';

export class StreamerBuilderView {
  constructor(root, { getSettings, onApply, onExportChange, onAction }) {
    this.root = root;
    this.getSettings = getSettings;
    this.onApply = onApply;
    this.onExportChange = onExportChange;
    this.onAction = onAction;
    this.obsMethod = ['subtle', 'full'].includes(getSettings().gyro) ? 'window' : 'browser';
    this.chroma = 'green';
    this.inputState = 'waiting';
    this.previousSettings = null;
    let storage;
    try { storage = window.localStorage; } catch { /* The editor still works without storage. */ }
    this.presets = new StreamerPresets(storage);
    this.bindDialog('obs-dialog', '[data-open-obs]');
    this.bindDialog('saved-looks-dialog', '[data-open-saved]');
    this.buildLooks();
    this.bindSavedLooks();
    this.bindSetup();
    this.bindScene();
    this.$('undo-settings').addEventListener('click', () => this.undo());
    this.render(getSettings());
  }

  $(id) { return this.root.getElementById(id); }

  bindDialog(id, selector) {
    const dialog = this.$(id);
    this.root.querySelectorAll(selector).forEach(button => button.addEventListener('click', () => {
      if (id === 'saved-looks-dialog') this.renderSavedLooks();
      dialog.showModal();
      this.onAction(id === 'obs-dialog' ? 'guide_opened' : 'saved_looks_opened');
    }));
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  }

  buildLooks() {
    for (const look of StreamerPresets.looks) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'look-card'; button.dataset.look = look.id;
      button.setAttribute('aria-label', `Apply ${look.name} look`);
      const settings = StreamerPresets.lookSettings(look);
      for (const key of ['body', 'light', 'highlight']) button.style.setProperty('--look-' + key, settings[key]);
      button.innerHTML = '<svg viewBox="0 0 100 60" aria-hidden="true"><use href="#look-controller"/></svg><span></span>';
      button.querySelector('span').textContent = look.name;
      button.addEventListener('click', () => {
        this.apply(StreamerPresets.applyLook(look.id, this.getSettings()), `${look.name} look applied.`);
        this.onAction('look_selected', { look: look.id });
      });
      this.$('ready-looks').append(button);
    }
  }

  apply(settings, message) {
    this.previousSettings = { ...this.getSettings() };
    this.onApply(settings);
    this.$('settings-notice').textContent = message;
  }

  reset() {
    this.apply({ ...StreamerSettings.defaults }, 'Settings reset. You can undo this.');
    this.onAction('settings_reset');
  }

  undo() {
    if (!this.previousSettings) return;
    const previous = this.previousSettings;
    this.previousSettings = null;
    this.onApply(previous);
    this.$('settings-notice').textContent = 'Previous look restored.';
    this.onAction('settings_restored');
  }

  render(settings) {
    this.$('undo-settings').disabled = !this.previousSettings;
    this.root.querySelectorAll('[data-look]').forEach(button => {
      const look = StreamerPresets.applyLook(button.dataset.look, settings);
      button.setAttribute('aria-pressed', String(Object.keys(look).every(key => look[key] === settings[key])));
    });
    this.renderSetup();
  }

  bindSavedLooks() {
    this.$('save-look-form').addEventListener('submit', event => {
      event.preventDefault();
      try {
        const record = this.presets.save(this.$('saved-look-name').value, this.getSettings());
        this.$('saved-look-name').value = '';
        this.renderSavedLooks();
        this.$('saved-look-status').textContent = `“${record.name}” saved on this device.`;
        this.onAction('look_saved');
      } catch (error) { this.$('saved-look-status').textContent = error.message; }
    });
  }

  renderSavedLooks() {
    const list = this.$('saved-looks-list');
    list.replaceChildren();
    this.$('saved-look-status').textContent = '';
    try {
      const records = this.presets.list();
      this.$('saved-looks-empty').hidden = records.length > 0;
      for (const record of records) {
        const item = document.createElement('li');
        const name = document.createElement('span'); name.textContent = record.name;
        const restore = document.createElement('button'); restore.type = 'button'; restore.textContent = 'Apply';
        restore.setAttribute('aria-label', `Apply saved look ${record.name}`);
        restore.addEventListener('click', () => {
          this.apply(record.settings, `“${record.name}” applied.`);
          this.$('saved-looks-dialog').close();
          this.onAction('saved_look_applied');
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove saved look ${record.name}`);
        remove.addEventListener('click', () => {
          try {
            this.presets.remove(record.id);
            this.renderSavedLooks();
            this.$('saved-look-status').textContent = `“${record.name}” removed from saved looks.`;
            this.$('saved-look-name').focus();
            this.onAction('saved_look_removed');
          } catch (error) { this.$('saved-look-status').textContent = error.message; }
        });
        item.append(name, restore, remove); list.append(item);
      }
    } catch (error) {
      this.$('saved-looks-empty').hidden = true;
      this.$('saved-look-status').textContent = error.message;
    }
  }

  bindSetup() {
    this.root.querySelectorAll('[data-obs-method]').forEach(button => button.addEventListener('click', () => {
      this.obsMethod = button.dataset.obsMethod;
      this.$('export-status').textContent = '';
      this.$('copy-toast').textContent = '';
      this.renderSetup();
      this.onExportChange();
      this.onAction('guide_method_selected', { capture_method: this.obsMethod });
    }));
    this.$('obs-chroma').addEventListener('change', event => {
      this.chroma = event.target.value;
      this.renderSetup();
      this.onExportChange();
    });
  }

  exportSettings() { return StreamerSettings.forOBS(this.getSettings(), this.obsMethod, this.chroma); }

  exportURL(base) { return StreamerSettings.url(base, this.exportSettings(), { setup: this.obsMethod === 'window' }); }

  setInputState(state) { this.inputState = state; this.renderSetup(); }

  renderSetup() {
    this.root.querySelectorAll('[data-obs-method]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.obsMethod === this.obsMethod)));
    this.$('obs-browser-steps').hidden = this.obsMethod !== 'browser';
    this.$('obs-window-steps').hidden = this.obsMethod !== 'window';
    this.$('open-capture').hidden = this.obsMethod !== 'window';
    this.$('copy-overlay').textContent = this.obsMethod === 'browser' ? 'Copy OBS link' : 'Copy capture link';
    this.$('obs-background-note').textContent = this.obsMethod === 'browser'
      ? (this.getSettings().gyro !== 'off' ? 'Gyro movement needs Browser window capture. This Browser Source link supports normal controller input.' : 'Your OBS link uses a transparent background. Your look stays the same.')
      : `Your capture link uses a ${this.chroma} background. Match it with a Chroma Key filter in OBS.`;
    const status = this.$('obs-input-check');
    status.dataset.connected = String(['gamepad', 'direct'].includes(this.inputState));
    status.textContent = ['gamepad', 'direct'].includes(this.inputState)
      ? 'Controller input detected here. Check it again inside OBS after switching to your game.'
      : 'Connect your controller and press a button to check input here. You can copy your link anytime.';
    if (['blocked', 'unsupported'].includes(this.inputState)) status.textContent = 'Live input is unavailable here. Try a DualSense in desktop Chrome or Edge; you can still customize and copy your link.';
    this.$('obs-browser-check').textContent = this.obsMethod === 'window' && (!navigator.hid || !isSecureContext)
      ? 'Direct connection needs desktop Chrome or Edge. Copy the capture link and open it there.'
      : this.obsMethod === 'window' ? 'Open the capture page, connect your DualSense, then hide setup before recording.' : 'In OBS, use Interact to activate controller input. The check above describes this page, not OBS.';
  }

  bindScene() {
    const stage = this.$('preview-stage');
    this.root.querySelectorAll('[data-preview-mode]').forEach(button => button.addEventListener('click', () => {
      const mode = button.dataset.previewMode;
      stage.classList.toggle('scene-mode', mode === 'scene');
      this.$('scene-controls').hidden = mode !== 'scene';
      this.$('sample-scene').hidden = mode !== 'scene';
      this.root.querySelectorAll('[data-preview-mode]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      this.onAction('scene_preview_changed', { preview_mode: mode });
    }));
    this.$('scene-theme').addEventListener('change', event => { stage.dataset.sceneTheme = event.target.value; });
    this.$('scene-position').addEventListener('change', event => { stage.dataset.scenePosition = event.target.value; });
    this.$('scene-size').addEventListener('input', event => {
      stage.style.setProperty('--scene-size', event.target.value + '%');
      this.$('scene-size-value').value = event.target.value + '%';
    });
  }
}

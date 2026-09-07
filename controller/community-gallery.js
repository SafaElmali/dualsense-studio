import { StreamerPresets } from './streamer-presets.js';
import { StreamerRotation } from './streamer-rotation.js';
import { CommunityLook } from './community-look.js';
import { CommunityGalleryClient } from './community-gallery-client.js';
import { ControllerInput } from './input-state.js';
import { AppEvents } from './app-events.js';

const $ = id => document.getElementById(id);
const client = new CommunityGalleryClient();
const analytics = new AppEvents();
const track = action => analytics.featureAction('community_gallery', action);
let view, selected, disposed = false;
const picks = StreamerPresets.looks.map(look => ({ id: 'studio-' + look.id, name: look.name, creator: 'DualSense Studio', settings: StreamerPresets.lookSettings(look) }));

function preview() {
  if (!view?.ready || !selected) return;
  const settings = selected.settings;
  view.setBodyColor(settings.body); view.setLightColor(settings.light);
  view.setHighlight({ color: settings.highlight, opacity: settings.highlightOpacity });
  view.setStickArrows(settings);
  if (settings.camera === 'custom') view.pose = StreamerRotation.toPose(settings);
  else if (['angle', 'auto'].includes(settings.camera)) view.pose = StreamerRotation.toPose({ pitch: 40, yaw: -4, roll: 0 });
  else view.setView(settings.camera, { resetZoom: false });
  view.setZoom(.88 * settings.scale / 100);
}

function select(look) {
  selected = look;
  $('gallery-look-name').textContent = look.name;
  $('gallery-look-creator').textContent = `By ${look.creator}`;
  $('gallery-apply').href = CommunityLook.editorURL(location.href, look.settings);
  $('gallery-copy-status').textContent = '';
  document.querySelectorAll('[data-gallery-look]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.galleryLook === look.id)));
  preview();
}

function render(looks, root) {
  const nodes = looks.map(look => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'gallery-card'; button.dataset.galleryLook = look.id;
    button.setAttribute('aria-pressed', String(selected?.id === look.id));
    button.setAttribute('aria-label', `Preview ${look.name} by ${look.creator}`);
    const palette = document.createElement('span'); palette.className = 'gallery-palette'; palette.setAttribute('aria-hidden', 'true');
    for (const key of ['body', 'light', 'highlight']) { const swatch = document.createElement('i'); swatch.style.backgroundColor = look.settings[key]; palette.append(swatch); }
    const copy = document.createElement('span'); copy.className = 'gallery-card-copy';
    const name = document.createElement('strong'); name.textContent = look.name;
    const creator = document.createElement('small'); creator.textContent = `By ${look.creator}`;
    copy.append(name, creator); button.append(palette, copy);
    button.addEventListener('click', () => { select(look); track('previewed'); });
    return button;
  });
  root.replaceChildren(...nodes);
}

async function refresh() {
  $('gallery-refresh').disabled = true;
  $('gallery-status').textContent = 'Loading community looks…';
  try {
    const looks = await client.list();
    if (disposed) return;
    render(looks, $('community-looks'));
    $('gallery-empty').hidden = looks.length > 0;
    $('gallery-status').textContent = looks.length ? `${looks.length} shared ${looks.length === 1 ? 'look' : 'looks'} · Newest first` : '';
    if (selected && !picks.some(look => look.id === selected.id) && !looks.some(look => look.id === selected.id)) select(picks[0]);
    track('loaded');
  } catch (error) { if (!disposed) { $('gallery-status').textContent = error.message + ' Studio picks are still available below.'; track('load_failed'); } }
  finally { if (!disposed) $('gallery-refresh').disabled = false; }
}

render(picks, $('studio-looks')); select(picks[0]); track('opened');
$('gallery-refresh').addEventListener('click', refresh);
$('gallery-apply').addEventListener('click', () => track('applied'));
$('gallery-copy').addEventListener('click', async () => {
  const url = CommunityLook.editorURL(location.href, selected.settings);
  try { await navigator.clipboard.writeText(url); $('gallery-copy-status').textContent = 'Look link copied.'; track('link_copied'); }
  catch { $('gallery-copy-status').textContent = `Copy this link: ${url}`; }
});
void refresh();
window.addEventListener('pagehide', () => { disposed = true; view?.dispose(); }, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
try {
  const { DualSenseView } = await import('./controller-view.js?v=performance-1');
  if (!disposed) {
    view = new DualSenseView($('gallery-canvas'), new ControllerInput(), { pauseWhenOffscreen: true });
    await view.load();
    if (disposed) view.dispose();
    else { preview(); $('gallery-model-status').hidden = true; }
  }
} catch { if (!disposed) $('gallery-model-status').textContent = '3D preview unavailable. You can still browse colors and use any look.'; }

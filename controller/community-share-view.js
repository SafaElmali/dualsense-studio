import { CommunityGalleryClient } from './community-gallery-client.js';

export class CommunityShareView {
  constructor(root, { getSettings, onAction = () => {}, client = new CommunityGalleryClient() }) {
    const dialog = root.getElementById('community-share-dialog');
    if (!dialog) return;
    const form = dialog.querySelector('form'), status = root.getElementById('community-share-status');
    const submit = form.querySelector('[type=submit]'), launch = root.getElementById('share-community-look');
    const savedDialog = root.getElementById('saved-looks-dialog');
    let settings, busy = false, returnToSaved = false;
    launch.addEventListener('click', () => {
      settings = { ...getSettings() }; status.textContent = '';
      returnToSaved = !!savedDialog?.open;
      if (returnToSaved) savedDialog.close();
      dialog.showModal(); onAction('share_opened');
    });
    dialog.addEventListener('close', () => {
      if (returnToSaved) { returnToSaved = false; savedDialog.showModal(); launch.focus(); }
    });
    dialog.querySelector('[data-close-community]').addEventListener('click', () => dialog.close());
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      busy = true; submit.disabled = true; launch.disabled = true; status.textContent = 'Sending your look…';
      const fields = new FormData(form);
      onAction('submit_requested');
      try {
        await client.submit({ name: fields.get('name'), creator: fields.get('creator'), consent: fields.has('consent'), website: fields.get('website'), settings });
        status.textContent = 'Look received! It will appear in the community gallery after review.';
        form.reset(); onAction('submitted');
      } catch (error) { status.textContent = error.message; onAction('submit_failed'); }
      finally { busy = false; submit.disabled = false; launch.disabled = false; }
    });
  }
}

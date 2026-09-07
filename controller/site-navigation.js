// Native disclosure keeps the navigation usable before the 3D app has loaded.
for (const navigation of document.querySelectorAll('.site-navigation')) {
  const menu = navigation.querySelector('details');
  const summary = menu.querySelector('summary');
  const close = () => { menu.open = false; };
  document.addEventListener('pointerdown', event => { if (!menu.contains(event.target)) close(); });
  document.addEventListener('focusin', event => { if (!menu.contains(event.target)) close(); });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) { event.preventDefault(); event.stopPropagation(); close(); summary.focus(); }
    else if (event.key === 'ArrowDown' && event.target === summary) {
      event.preventDefault(); menu.open = true; menu.querySelector('.site-play-menu :is(a,button)').focus();
    }
  });
  menu.addEventListener('click', event => { if (event.target.closest('.site-play-menu :is(a,button)')) close(); });
}

// Match the browser import map when testing the real renderer module in Node.
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') {
    return nextResolve(new URL('../../controller/vendor/three/three.module.min.js', import.meta.url).href, context);
  }
  if (specifier.startsWith('three/addons/')) {
    return nextResolve(new URL('../../controller/vendor/three/addons/' + specifier.slice('three/addons/'.length), import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}

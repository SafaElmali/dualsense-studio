import test from 'node:test';
import assert from 'node:assert/strict';
import * as module from 'node:module';
import { resolve } from './helpers/three-loader.mjs';
import * as THREE from '../controller/vendor/three/three.module.min.js';

if (module.registerHooks) module.registerHooks({ resolve });
else module.register('./helpers/three-loader.mjs', import.meta.url);
const { DualSenseView } = await import('../controller/controller-view.js');

const prepare = model => DualSenseView.prototype.preparePicking.call({ model });

test('accelerated picking preserves exact hits, normals, and occlusion after controls move', () => {
  const model = new THREE.Group(), control = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.1, 40, 32), new THREE.MeshStandardMaterial());
  const button = new THREE.Mesh(new THREE.TorusKnotGeometry(.6, .15, 100, 12), new THREE.MeshStandardMaterial());
  button.position.z = .9;
  control.add(button); model.add(shell, control);
  const indices = button.geometry.index.array.slice();
  const marker = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial());
  marker.raycast = () => {}; marker.position.z = 3; model.add(marker);
  prepare(model);
  assert.deepEqual(button.geometry.index.array, indices, 'Acceleration must not reorder the render geometry');
  assert.equal(marker.geometry.boundsTree, undefined, 'Feedback decorations must remain unpickable');
  const meshes = [shell, button], accelerated = meshes.map(mesh => mesh.raycast);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.z = 6; camera.updateMatrixWorld();
  const raycaster = new THREE.Raycaster(); raycaster.firstHitOnly = true;
  for (const rotation of [0, .7, Math.PI]) {
    model.rotation.y = rotation; control.rotation.x = rotation / 3;
    control.position.x = rotation / 8;
    model.updateMatrixWorld(true);
    for (let y = -.6; y <= .6; y += .12) for (let x = -.6; x <= .6; x += .12) {
      raycaster.setFromCamera(new THREE.Vector2(x + .0031, y + .0027), camera);
      const hit = raycaster.intersectObject(model, true)[0];
      meshes.forEach(mesh => { mesh.raycast = THREE.Mesh.prototype.raycast; });
      const expected = raycaster.intersectObject(model, true)[0];
      meshes.forEach((mesh, i) => { mesh.raycast = accelerated[i]; });
      assert.equal(hit?.object, expected?.object);
      if (!expected) continue;
      assert.ok(Math.abs(hit.distance - expected.distance) < 1e-6);
      assert.ok(hit.point.distanceTo(expected.point) < 1e-6);
      assert.ok(hit.face.normal.distanceTo(expected.face.normal) < 1e-6, `Normal mismatch at ${rotation},${x},${y}: faces ${hit.faceIndex}/${expected.faceIndex}`);
    }
  }
});

test('shells still block hidden buttons and moving the shell exposes the button', () => {
  const model = new THREE.Group();
  const button = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .2), new THREE.MeshStandardMaterial());
  const shell = new THREE.Mesh(new THREE.BoxGeometry(2, 2, .2), new THREE.MeshStandardMaterial());
  shell.position.z = 1; model.add(button, shell); prepare(model);
  const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 0, 5), new THREE.Vector3(0, 0, -1));
  raycaster.firstHitOnly = true;
  model.updateMatrixWorld(true);
  assert.equal(raycaster.intersectObject(model, true)[0].object, shell);
  shell.position.x = 3; model.updateMatrixWorld(true);
  assert.equal(raycaster.intersectObject(model, true)[0].object, button);
});

test('offscreen views skip work, then resume without overriding modal suspension', t => {
  const previousAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 1;
  t.after(() => { globalThis.requestAnimationFrame = previousAnimationFrame; });
  const previousDocument = globalThis.document;
  globalThis.document = { hidden: false };
  t.after(() => { globalThis.document = previousDocument; });
  let renders = 0;
  const view = Object.assign(Object.create(DualSenseView.prototype), {
    inViewport: false, previousTime: 0, reducedMotion: { matches: false },
    pose: { x: 0, y: 0, z: 0 }, model: new THREE.Group(), controls: new Map(), lightMaterials: [],
    renderTouches() {}, renderer: { render() { renders++; } },
  });
  view.animate(100); assert.equal(renders, 0);
  view.inViewport = true; view.suspended = true;
  view.animate(200); assert.equal(renders, 0);
  view.suspended = false;
  view.animate(300); assert.equal(renders, 1);
  globalThis.document.hidden = true;
  view.animate(400); assert.equal(renders, 1);
  globalThis.document.hidden = false; delete view.inViewport;
  view.animate(500); assert.equal(renders, 2, 'Views without opt-in visibility tracking keep rendering');
});

test('zoom changes the projection without resizing the drawing buffer', () => {
  const camera = new THREE.PerspectiveCamera(32, 2, .1, 100);
  const view = Object.assign(Object.create(DualSenseView.prototype), {
    zoom: 1, camera, renderer: { setSize() { assert.fail('Zoom must not resize the canvas'); } },
  });
  const projection = camera.projectionMatrix.clone();
  view.setZoom(1.4);
  assert.equal(view.zoom, 1.4); assert.equal(camera.zoom, 1.4);
  assert.equal(camera.projectionMatrix.equals(projection), false);
  view.setView('front');
  assert.equal(view.zoom, 1); assert.equal(camera.zoom, 1);
  assert.ok(camera.projectionMatrix.equals(projection));
});

test('size notifications only resize the drawing buffer when dimensions change', () => {
  const size = new THREE.Vector2(800, 400), bounds = { width: 800, height: 400 };
  let resizes = 0;
  const view = Object.assign(Object.create(DualSenseView.prototype), {
    zoom: 1, camera: new THREE.PerspectiveCamera(32, 2, .1, 100),
    canvas: { parentElement: { getBoundingClientRect: () => bounds } },
    renderer: { getSize: target => target.copy(size), setSize(w, h) { size.set(w, h); resizes++; } },
  });
  view.resize(); view.resize(); assert.equal(resizes, 0);
  bounds.width = 600; view.resize(); view.resize(); assert.equal(resizes, 1);
  assert.equal(view.camera.aspect, 1.5);
  bounds.height = 0; view.resize(); assert.equal(resizes, 1);
});

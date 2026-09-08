import test from 'node:test';
import assert from 'node:assert/strict';
import * as module from 'node:module';
import { resolve } from './helpers/three-loader.mjs';
import * as THREE from '../controller/vendor/three/three.module.min.js';
import { ControllerInput } from '../controller/input-state.js';

if (module.registerHooks) module.registerHooks({ resolve });
else module.register('./helpers/three-loader.mjs', import.meta.url);
const { DualSenseView } = await import('../controller/controller-view.js');

function fixture() {
  const input = new ControllerInput(), model = new THREE.Group(), group = new THREE.Group();
  group.add(model);
  const view = Object.assign(Object.create(DualSenseView.prototype), {
    ready: true, input, model, controls: new Map(), touchSources: new Map(),
    pose: { x: 0, y: 0, z: 0 }, reducedMotion: { matches: false },
    idleMotion: { group, time: 0, quietFor: 0, canAnimate: () => true },
  });
  return { view, input, group, step: seconds => {
    for (let frame = 0; frame < Math.round(seconds * 60); frame++) view.updateIdleMotion(1 / 60);
  } };
}
const transform = group => [...group.position.toArray(), ...group.quaternion.toArray()];

test('idle float and tilt stay subtle without changing the requested pose or controller inputs', () => {
  const { view, input, group, step } = fixture();
  input.onChange = () => assert.fail('Presentation motion must not create controller input');
  step(2); assert.deepEqual(transform(group), [0, 0, 0, 0, 0, 0, 1]);
  step(4); assert.notEqual(group.position.y, 0); assert.notEqual(group.rotation.y, 0);
  for (let frame = 0; frame < 3600; frame++) {
    view.updateIdleMotion(1 / 60);
    assert.ok(Math.abs(group.position.y) <= .075);
    assert.ok(Math.abs(group.rotation.x) <= .035 && Math.abs(group.rotation.y) <= .065 && Math.abs(group.rotation.z) <= .012);
  }
  assert.deepEqual(view.pose, { x: 0, y: 0, z: 0 });
  assert.deepEqual(view.model.position.toArray(), [0, 0, 0]);
  assert.equal(input.buttons.size, 0);
  assert.deepEqual(input.axis('left'), { x: 0, y: 0 });
});

test('hover, held inputs, touch contacts and inspection freeze the transform until a quiet interval passes', () => {
  const interactions = [
    view => { view.hover = { id: 'cross' }; return () => { view.hover = null; }; },
    view => { view.input.setButton('r2', 'gamepad', .4); return () => view.input.setButton('r2', 'gamepad', 0); },
    view => { view.input.setAxis('left', 'keyboard', .1, 0); return () => view.input.releaseAxis('left', 'keyboard'); },
    view => { view.setTouchContacts('hardware', [{ x: .5, y: .5 }]); return () => view.setTouchContacts('hardware', []); },
    view => { view.idleMotion.canAnimate = () => false; return () => { view.idleMotion.canAnimate = () => true; }; },
  ];
  for (const interact of interactions) {
    const { view, group, step } = fixture(); step(6);
    const frozen = transform(group), release = interact(view);
    step(5); assert.deepEqual(transform(group), frozen);
    release(); step(2); assert.deepEqual(transform(group), frozen);
    step(1); assert.notDeepEqual(transform(group), frozen);
    assert.ok(Math.abs(group.position.y - frozen[1]) < .04, 'Resuming must not catch up across the pause');
  }
});

test('reduced motion, gyro and explicit camera angles clear decorative motion', () => {
  for (const disable of [
    view => { view.reducedMotion.matches = true; },
    view => { view.gyroEnabled = true; },
    view => { view.setView('back', { resetZoom: false }); view.idleMotion.canAnimate = () => false; },
  ]) {
    const { view, group, step } = fixture(); step(6); disable(view); step(6);
    assert.deepEqual(transform(group), [0, 0, 0, 0, 0, 0, 1]);
  }
  const { view, group, step } = fixture();
  view.idleMotion = null; step(6);
  assert.deepEqual(transform(group), [0, 0, 0, 0, 0, 0, 1], 'Views that do not opt in remain still');
});

test('projected buttons and raycast targets agree while the presentation group moves', () => {
  const { view, group, step } = fixture();
  const button = new THREE.Group(); button.position.set(.8, .3, .2);
  button.userData = { control: 'cross', rest: button.position.clone(), surface: new THREE.Vector3(.8, .3, .35) };
  button.add(new THREE.Mesh(new THREE.BoxGeometry(.4, .4, .3), new THREE.MeshBasicMaterial()));
  view.model.add(button); view.controls.set('cross', button);
  view.canvas = { clientWidth: 800, clientHeight: 500, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 500 }) };
  view.camera = new THREE.PerspectiveCamera(32, 800 / 500, .1, 100);
  view.camera.position.z = 9; view.camera.updateMatrixWorld();
  view.raycaster = new THREE.Raycaster(); view.cursor = new THREE.Vector2();
  for (let sample = 0; sample < 12; sample++) {
    step(1); group.updateMatrixWorld(true);
    const point = view.projected('cross');
    assert.equal(view.hit(point.x, point.y)?.id, 'cross');
  }
});

test('hidden, offscreen and suspended renders freeze animation time without a catch-up on return', t => {
  const previousDocument = globalThis.document, previousFrame = globalThis.requestAnimationFrame;
  globalThis.document = { hidden: false }; globalThis.requestAnimationFrame = () => 1;
  t.after(() => { globalThis.document = previousDocument; globalThis.requestAnimationFrame = previousFrame; });
  const { view, step } = fixture(); step(6);
  Object.assign(view, { lightMaterials: [], renderTouches() {}, renderer: { render() {} } });
  view.animate(100);
  const time = view.idleMotion.time;
  view.inViewport = false; view.animate(10000);
  view.inViewport = true; view.suspended = true; view.animate(20000);
  view.suspended = false; document.hidden = true; view.animate(30000);
  assert.equal(view.idleMotion.time, time);
  document.hidden = false; view.animate(40000);
  assert.ok(view.idleMotion.time - time <= .051);
});

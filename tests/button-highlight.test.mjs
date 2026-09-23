import test from 'node:test';
import assert from 'node:assert/strict';
import { Color, Mesh, MeshPhysicalMaterial } from '../controller/vendor/three/three.core.min.js';
import { ShaderLib } from '../controller/vendor/three/three.module.min.js';
import { ButtonHighlight } from '../controller/button-highlight.js';

const mesh = (color = '#e9eaf0') => ({
  material: { color: new Color(color), emissive: new Color('#102030'), emissiveIntensity: .08, userData: { restColor: new Color(color) } },
  userData: { restEmissive: new Color('#102030'), restEmissiveIntensity: .08 },
});
const sameColor = (actual, expected) => {
  for (const channel of ['r', 'g', 'b']) assert.ok(Math.abs(actual[channel] - expected[channel]) < 1e-10);
};

test('full opacity produces the chosen color on light and dark surfaces, while zero restores the finish', () => {
  const highlight = new ButtonHighlight(new Color());
  highlight.set({ color: '#0046ff' });
  for (const finish of ['#e9eaf0', '#101114']) {
    const button = mesh(finish);
    highlight.apply(button, 1);
    sameColor(button.material.color, new Color('#0046ff'));
    highlight.set({ opacity: 0 });
    highlight.apply(button, 1);
    sameColor(button.material.color, button.material.userData.restColor);
    sameColor(button.material.emissive, button.userData.restEmissive);
    assert.equal(button.material.emissiveIntensity, button.userData.restEmissiveIntensity);
    highlight.set({ opacity: 100 });
  }
});

test('partial tint does not accumulate, release restores the latest shell finish', () => {
  const highlight = new ButtonHighlight(new Color()), button = mesh();
  highlight.set({ color: '#ff0000', opacity: 50 });
  highlight.apply(button, 1);
  const halfway = button.material.userData.restColor.clone().lerp(new Color('#ff0000'), .5);
  sameColor(button.material.color, halfway);
  for (let frame = 0; frame < 20; frame++) highlight.apply(button, 1);
  sameColor(button.material.color, halfway);
  button.material.userData.restColor.set('#123456');
  highlight.apply(button, 0);
  sameColor(button.material.color, new Color('#123456'));
});

test('button symbols contrast against bright and dark highlights and recover on release', () => {
  const highlight = new ButtonHighlight(new Color()), symbol = mesh('#b1b6c4');
  highlight.set({ color: '#ffff00' }); highlight.apply(symbol, 1, { symbol: true });
  sameColor(symbol.material.color, new Color('#152033'));
  highlight.set({ color: '#000080' }); highlight.apply(symbol, 1, { symbol: true });
  sameColor(symbol.material.color, new Color('#ffffff'));
  highlight.apply(symbol, 0, { symbol: true });
  sameColor(symbol.material.color, symbol.material.userData.restColor);
});

test('opacity preserves the independent microphone mute indicator', () => {
  const highlight = new ButtonHighlight(new Color()), button = mesh();
  highlight.set({ opacity: 0 }); highlight.apply(button, 1, { muted: true });
  sameColor(button.material.emissive, new Color('#dc6615'));
  assert.equal(button.material.emissiveIntensity, .7);
  highlight.apply(button, 0);
  sameColor(button.material.emissive, button.userData.restEmissive);
});

test('partial dark highlights keep dark symbols on the still-light button surface', () => {
  const highlight = new ButtonHighlight(new Color()), button = mesh(), symbol = mesh('#b1b6c4');
  highlight.set({ color: '#0046ff', opacity: 50 });
  highlight.apply(button, 1);
  highlight.apply(symbol, 1, { symbol: true, surfaceColor: button.material.color });
  for (const channel of ['r', 'g', 'b']) assert.ok(symbol.material.color[channel] < symbol.material.userData.restColor[channel]);
});

test('invalid customization is ignored and opacity stays in the supported range', () => {
  const highlight = new ButtonHighlight(new Color());
  highlight.set({ color: '#ff0000', opacity: 35 });
  highlight.set({ color: 'invalid', opacity: '' });
  sameColor(highlight.color, new Color('#ff0000')); assert.equal(highlight.opacity, 35);
  highlight.set({ opacity: -50 }); assert.equal(highlight.opacity, 0);
  highlight.set({ opacity: 200 }); assert.equal(highlight.opacity, 100);
});

test('solid feedback follows opacity and live colors without changing the resting physical finish', () => {
  const highlight = new ButtonHighlight(new Color());
  const button = new Mesh(undefined, new MeshPhysicalMaterial({ color: '#d0d4de', roughness: .23, clearcoat: .8 }));
  highlight.prepare(button, { solid: true });
  const shader = { uniforms: {}, fragmentShader: ShaderLib.physical.fragmentShader };
  button.material.onBeforeCompile(shader);
  const amount = shader.uniforms.buttonHighlightAmount, color = shader.uniforms.buttonHighlightColor;
  for (const opacity of [100, 50, 0]) {
    highlight.set({ opacity, color: '#0046ff' });
    highlight.apply(button, 1);
    assert.equal(amount.value, opacity / 100);
    sameColor(color.value, new Color('#0046ff'));
  }
  highlight.set({ opacity: 100, color: '#ffbf47' });
  highlight.apply(button, 1);
  sameColor(color.value, new Color('#ffbf47'));
  highlight.apply(button, 0);
  assert.equal(amount.value, 0);
  sameColor(button.material.color, new Color('#d0d4de'));
  assert.equal(button.material.roughness, .23);
  assert.equal(button.material.clearcoat, .8);
  assert.equal(button.material.transparent, false);
  assert.equal(button.material.depthTest, true, 'Hidden buttons stay occluded by the controller');
});

test('solid symbols track surface contrast, and disabling feedback still preserves mute state', () => {
  const highlight = new ButtonHighlight(new Color()), symbol = new Mesh(undefined, new MeshPhysicalMaterial());
  highlight.prepare(symbol, { solid: true });
  const uniforms = symbol.material.userData.highlightUniforms;
  for (const [surface, ink] of [['#ffbf47', '#152033'], ['#000080', '#ffffff']]) {
    highlight.apply(symbol, 1, { symbol: true, surfaceColor: new Color(surface) });
    sameColor(uniforms.buttonHighlightColor.value, new Color(ink));
  }
  highlight.set({ opacity: 0 });
  highlight.apply(symbol, 1, { muted: true });
  assert.equal(uniforms.buttonHighlightAmount.value, 0);
  sameColor(symbol.material.emissive, new Color('#dc6615'));
  assert.equal(symbol.material.emissiveIntensity, .7);
});

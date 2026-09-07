import test from 'node:test';
import assert from 'node:assert/strict';
import { Color } from '../controller/vendor/three/three.core.min.js';
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

// Applies a reversible tint to an existing material, keeping its 3D shading.
// Both the studio and OBS renderer use this same opacity scale.
export class ButtonHighlight {
  static defaults = Object.freeze({ color: '#ffbf47', opacity: 100 });

  constructor(color) {
    this.color = color.set(ButtonHighlight.defaults.color);
    this.opacity = ButtonHighlight.defaults.opacity;
    this.darkSymbol = color.clone().set('#152033');
    this.lightSymbol = color.clone().set('#ffffff');
  }

  set({ color, opacity } = {}) {
    if (/^#[\da-f]{6}$/i.test(color)) this.color.set(color);
    if (opacity !== undefined && opacity !== null && String(opacity).trim() !== '' && Number.isFinite(Number(opacity))) {
      this.opacity = Math.round(Math.max(0, Math.min(100, Number(opacity))));
    }
  }

  symbolColor(surfaceColor) {
    const luminance = .2126 * surfaceColor.r + .7152 * surfaceColor.g + .0722 * surfaceColor.b;
    return luminance > .179 ? this.darkSymbol : this.lightSymbol;
  }

  apply(mesh, strength, { symbol = false, muted = false, surfaceColor = this.color } = {}) {
    const material = mesh.material;
    const amount = Math.max(0, Math.min(1, strength)) * this.opacity / 100;
    material.color.copy(material.userData.restColor);
    material.emissive.copy(mesh.userData.restEmissive);
    material.emissiveIntensity = mesh.userData.restEmissiveIntensity;
    if (symbol) {
      material.color.lerp(this.symbolColor(surfaceColor), amount);
      return;
    }
    if (muted) { material.emissive.set('#dc6615'); material.emissiveIntensity = .7; }
    // 100% uses the full chosen color, rather than capping the tint at 40%.
    material.color.lerp(this.color, amount);
    material.emissive.lerp(this.color, amount);
    material.emissiveIntensity += (.12 - material.emissiveIntensity) * amount;
  }
}

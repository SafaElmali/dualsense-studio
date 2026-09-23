// Applies reversible feedback without replacing a button's resting material.
// Both the studio and OBS renderer use this same opacity scale.
export class ButtonHighlight {
  static defaults = Object.freeze({ color: '#ffbf47', opacity: 100 });

  constructor(color) {
    this.color = color.set(ButtonHighlight.defaults.color);
    this.opacity = ButtonHighlight.defaults.opacity;
    this.darkSymbol = color.clone().set('#152033');
    this.lightSymbol = color.clone().set('#ffffff');
  }

  prepare(mesh, { solid = false } = {}) {
    const material = mesh.material;
    material.userData.restColor = material.color.clone();
    mesh.userData.restEmissive = material.emissive.clone();
    mesh.userData.restEmissiveIntensity = material.emissiveIntensity;
    if (!solid) return;
    const uniforms = {
      buttonHighlightColor: { value: this.color },
      buttonHighlightAmount: { value: 0 },
    };
    material.userData.highlightUniforms = uniforms;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      // Apply the color after tone mapping so lighting and clearcoat cannot
      // wash out small inputs. Retain a little shading to show the cap shape.
      shader.fragmentShader = 'uniform vec3 buttonHighlightColor;\nuniform float buttonHighlightAmount;\n' + shader.fragmentShader.replace(
        '#include <tonemapping_fragment>',
        '#include <tonemapping_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, buttonHighlightColor, buttonHighlightAmount * 0.9);',
      );
    };
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
    const uniforms = material.userData.highlightUniforms;
    if (uniforms) {
      uniforms.buttonHighlightAmount.value = amount;
      uniforms.buttonHighlightColor.value = symbol ? this.symbolColor(surfaceColor) : this.color;
    }
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

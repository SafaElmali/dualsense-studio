import { Euler, Quaternion } from './vendor/three/three.module.min.js';

// Motion is relative to the streamer's holding position and chosen camera angle.
// The view interpolates the resulting quaternion each frame to smooth sensor jitter.
export class StreamerMotion {
  constructor() {
    this.mode = 'off';
    this.base = new Quaternion();
    this.relative = new Quaternion();
    this.identity = new Quaternion();
    this.result = new Quaternion();
    this.reset();
  }

  configure(mode, pose) {
    if (mode !== this.mode) { this.mode = mode; this.reset(); }
    this.base.setFromEuler(new Euler(pose.x, pose.y, pose.z));
  }

  reset() { this.reference = null; this.latest = null; }

  recenter() {
    if (!this.latest || this.mode === 'off') return null;
    this.reference = this.latest.clone().invert();
    return this.base.toArray();
  }

  update({ orientation }) {
    if (this.mode === 'off' || orientation?.length !== 4 || !orientation.every(Number.isFinite) || Math.hypot(...orientation) < .001) return null;
    this.latest = new Quaternion().fromArray(orientation).normalize();
    if (!this.reference) this.recenter();
    this.relative.multiplyQuaternions(this.reference, this.latest).normalize();
    if (this.mode === 'subtle') {
      const angle = this.identity.angleTo(this.relative);
      // A third of the physical rotation, capped at 25° to keep inputs readable.
      this.relative.slerp(this.identity, 1 - (angle ? Math.min(.35, 25 * Math.PI / 180 / angle) : 0));
    }
    return this.result.multiplyQuaternions(this.base, this.relative).normalize().toArray();
  }
}

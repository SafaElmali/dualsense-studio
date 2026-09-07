// Captured drags set a portable orientation without generating controller inputs.
export class StreamerRotation {
  constructor({ onChange = () => {}, onCommit = () => {} } = {}) {
    this.onChange = onChange;
    this.onCommit = onCommit;
    this.gesture = null;
  }

  static fromPose(pose) {
    const degrees = value => Math.round((((value * 180 / Math.PI + 180) % 360 + 360) % 360 - 180) * 10) / 10;
    return { pitch: degrees(pose.x), yaw: degrees(pose.y), roll: degrees(pose.z) };
  }
  static toPose({ pitch, yaw, roll }) {
    return { x: pitch * Math.PI / 180, y: yaw * Math.PI / 180, z: roll * Math.PI / 180 };
  }

  start(id, x, y, pose, size, roll = false) {
    if (this.gesture) return false;
    this.gesture = { id, x, y, pose: { ...pose }, sensitivity: Math.PI / Math.max(160, size), roll, moved: false };
    return true;
  }

  move(id, x, y) {
    const drag = this.gesture;
    if (!drag || drag.id !== id) return;
    const dx = x - drag.x, dy = y - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    const pose = { ...drag.pose };
    if (drag.roll) pose.z -= dx * drag.sensitivity;
    else { pose.x += dy * drag.sensitivity; pose.y += dx * drag.sensitivity; }
    this.onChange(StreamerRotation.fromPose(pose));
  }

  end(id = this.gesture?.id) {
    if (!this.gesture || this.gesture.id !== id) return;
    const { moved } = this.gesture;
    this.gesture = null;
    if (moved) this.onCommit();
  }
}

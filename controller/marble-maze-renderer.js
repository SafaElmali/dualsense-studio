import * as THREE from './vendor/three/three.module.min.js';
import { MarbleMaze } from './marble-maze.js';

export class MarbleMazeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x111215, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xc9deff, 0x24252e, 2.4));
    const light = new THREE.DirectionalLight(0xffe5b0, 4); light.position.set(-3, 9, 5); this.scene.add(light);
    const rim = new THREE.DirectionalLight(0x5f9dff, 2); rim.position.set(6, 3, -6); this.scene.add(rim);
    this.camera = new THREE.OrthographicCamera(-7, 7, 6, -6, .1, 50);
    this.camera.position.set(0, 12, 8); this.camera.lookAt(0, 0, 0);
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement); this.resize();
  }

  resize() {
    const { width, height } = this.canvas.parentElement.getBoundingClientRect();
    if (!width || !height) return;
    const aspect = width / height, half = Math.max(5.2, 6 / aspect);
    this.camera.left = -half * aspect; this.camera.right = half * aspect;
    this.camera.top = half; this.camera.bottom = -half;
    this.camera.updateProjectionMatrix(); this.renderer.setSize(width, height, false);
  }

  clearBoard() {
    if (!this.board) return;
    const materials = new Set();
    this.board.traverse(object => { object.geometry?.dispose(); if (object.material) materials.add(object.material); });
    materials.forEach(material => material.dispose()); this.scene.remove(this.board);
  }

  load(level) {
    this.clearBoard(); this.board = new THREE.Group(); this.scene.add(this.board);
    const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .4, metalness: .25, ...options });
    const floor = material(0x303847), wallMaterial = material(0x76869b), railMaterial = material(0x242c3a);
    const gold = material(0xffbf47, { metalness: .65, roughness: .23, emissive: 0x9b520b, emissiveIntensity: .4 });
    const shape = new THREE.Shape();
    shape.moveTo(-5, -4); shape.lineTo(5, -4); shape.lineTo(5, 4); shape.lineTo(-5, 4); shape.closePath();
    for (const pit of level.pits) { const hole = new THREE.Path(); hole.absarc(pit.x, -pit.y, pit.r, 0, Math.PI * 2, true); shape.holes.push(hole); }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: .26, bevelEnabled: false, curveSegments: 32 });
    geometry.rotateX(-Math.PI / 2);
    const slab = new THREE.Mesh(geometry, floor); slab.position.y = -.26; this.board.add(slab);
    const box = (x, z, w, h, depth, mat) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, depth, h), mat);
      mesh.position.set(x, depth / 2, z); this.board.add(mesh);
    };
    for (const wall of level.walls) box(wall.x, wall.y, wall.w, wall.h, .36, wallMaterial);
    box(0, -4.15, 10.6, .3, .32, railMaterial); box(0, 4.15, 10.6, .3, .32, railMaterial);
    box(-5.15, 0, .3, 8, .32, railMaterial); box(5.15, 0, .3, 8, .32, railMaterial);
    const ring = (x, y, radius, mat) => {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, .035, 10, 48), mat);
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, .025, y); this.board.add(mesh);
    };
    ring(level.goal.x, level.goal.y, .48, gold);
    ring(level.goal.x, level.goal.y, .33, gold);
    ring(level.start.x, level.start.y, .36, material(0x8ca6c9));
    for (const pit of level.pits) {
      ring(pit.x, pit.y, pit.r + .025, material(0x11151e));
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(pit.r, 40), new THREE.MeshBasicMaterial({ color: 0x050609 }));
      bottom.rotation.x = -Math.PI / 2; bottom.position.set(pit.x, -.4, pit.y); this.board.add(bottom);
    }
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x62748e, transparent: true, opacity: .3 });
    const positions = [];
    for (let x = -4.5; x < 5; x += .5) for (let y = -3.5; y < 4; y += .5) {
      if (level.pits.some(pit => Math.hypot(x - pit.x, y - pit.y) < pit.r + .1)) continue;
      positions.push([x, .002, y]);
    }
    const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(.017, 6), gridMaterial, positions.length);
    const matrix = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    positions.forEach((position, index) => { matrix.setPosition(...position); dots.setMatrixAt(index, matrix); });
    this.board.add(dots);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(MarbleMaze.radius, 28, 20), material(0xffd883, { metalness: .75, roughness: .17 }));
    this.board.add(this.ball);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(.26, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .35, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.board.add(this.shadow);
  }

  render(game, tilt) {
    if (!this.board) return;
    this.ball.position.set(game.ball.x, MarbleMaze.radius + .012, game.ball.y);
    this.shadow.position.set(game.ball.x + .07, .008, game.ball.y + .07);
    this.board.rotation.z = this.reducedMotion.matches ? 0 : -tilt.x * .035;
    this.board.rotation.x = this.reducedMotion.matches ? 0 : tilt.y * .035;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() { this.resizeObserver.disconnect(); this.clearBoard(); this.renderer.dispose(); }
}

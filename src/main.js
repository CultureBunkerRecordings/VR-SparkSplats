import * as THREE from 'three';
import { SparkRenderer, SplatMesh, VRButton } from '@sparkjsdev/spark';

// =====================================================
// Scene (only for UI, controllers, VR button)
// =====================================================
const scene = new THREE.Scene();

// IMPORTANT: Camera must start at (0,0,0)
// WebXR overwrites it anyway.
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);

// -----------------------------------------------------
// Three.js Renderer
// -----------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFramebufferScaleFactor(2.0);  // stable for Quest 2

document.body.appendChild(renderer.domElement);

// VR Button
const vrButton = VRButton.createButton(renderer);
if (vrButton instanceof HTMLElement) document.body.appendChild(vrButton);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================================================
// Spark Renderer (this owns splats — NOT the scene)
// =====================================================
const spark = new SparkRenderer({
  renderer,
  maxStdDev: Math.sqrt(5)
});

// Must be in scene graph
scene.add(spark);

// =====================================================
// Splat Manager (load-on-demand, only 1 splat in memory)
// =====================================================
const splatUrls = [
  './gs_Peter.splat',
  './gs_Dead_Christ.splat',
  './gs_TheseusAndMinotaurLuma.splat',
  './gs_Elephant.splat',
  './gs_Eistiens.splat'
];

let currentSplatIndex = 0;
let currentSplat = null;

// Dispose safely
function disposeSplat(mesh) {
  if (!mesh) return;
  if (mesh.material) mesh.material.dispose();
  if (mesh.geometry) mesh.geometry.dispose();
  mesh.parent?.remove(mesh);
}

// Load splat
function loadSplat(url) {
  disposeSplat(currentSplat);

  currentSplat = new SplatMesh({ url });

  // Position splat in front of user
  currentSplat.position.set(0, 0, -2);
  currentSplat.rotation.set(Math.PI, 0, 0);

  spark.add(currentSplat);
}

// Cycle splat
function cycleSplat(delta = 1) {
  currentSplatIndex =
    (currentSplatIndex + delta + splatUrls.length) % splatUrls.length;

  loadSplat(splatUrls[currentSplatIndex]);

  // Haptics
  try {
    const c = renderer.xr.getController(0);
    const gp = c?.gamepad;
    if (gp?.hapticActuators?.length)
      gp.hapticActuators[0].pulse(0.5, 50);
  } catch (e) {}
}

// Load first splat
loadSplat(splatUrls[currentSplatIndex]);

// =====================================================
// Controllers
// =====================================================
const c1 = renderer.xr.getController(0);
c1.addEventListener('select', () => cycleSplat(1));
c1.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(c1);

const c2 = renderer.xr.getController(1);
c2.addEventListener('select', () => cycleSplat(1));
c2.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(c2);

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowRight' || e.code === 'Space') cycleSplat(1);
  else if (e.code === 'ArrowLeft') cycleSplat(-1);
});

// =====================================================
// Soft stabilization (Spark 0.1.10 compatible)
// =====================================================
let lastPos = new THREE.Vector3();
const STAB = 0.18;

// No localFrame — move splat instead
function stabilize() {
  if (!renderer.xr.isPresenting) return;

  const camPos = camera.getWorldPosition(new THREE.Vector3());

  if (lastPos.distanceTo(camPos) > STAB) {
    // Move world opposite of camera jump
    spark.position.sub(camPos).add(lastPos);
  }

  lastPos.copy(camPos);
}

// =====================================================
// Main Loop
// =====================================================
renderer.setAnimationLoop(() => {
  stabilize();
  renderer.render(scene, camera);
});

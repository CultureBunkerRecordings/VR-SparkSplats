import * as THREE from 'three';
import { SparkRenderer, SplatMesh, VRButton } from '@sparkjsdev/spark';

// ------- Scene, Renderer -------
// Scene only for NON-SPLAT objects (controllers, UI, etc)
const scene = new THREE.Scene();

// Minimal dummy camera for Three.js (not used for splats)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFramebufferScaleFactor(1.0);

document.body.appendChild(renderer.domElement);

// VR button
const vrButton = VRButton.createButton(renderer);
if (vrButton instanceof HTMLElement) document.body.appendChild(vrButton);

// ---------------- Spark Renderer (handles its own XR camera!) ----------------
const spark = new SparkRenderer({
  renderer,
  maxStdDev: Math.sqrt(5)
});
scene.add(spark); // only needed so Spark has a parent

// ------------------ Splat Manager ------------------
const splatUrls = [
  './gs_TheseusAndMinotaurLuma.splat',
  './gs_Elephant.splat',
  './gs_Eistiens.splat'
];

let currentSplatIndex = 0;
let currentSplat = null;

function disposeSplat(s) {
  if (!s) return;
  if (s.material) s.material.dispose();
  if (s.geometry) s.geometry.dispose();
  s.parent?.remove(s);
}

// Load splat
function loadSplat(url) {
  disposeSplat(currentSplat);

  currentSplat = new SplatMesh({ url });
  currentSplat.position.set(0, 0, -2);

  // Make upright
  currentSplat.rotation.set(Math.PI, 0, 0);

  // Add directly to spark, NOT scene or localFrame
  spark.add(currentSplat);
}

// Cycle splat
function cycleSplat(delta = 1) {
  currentSplatIndex = (currentSplatIndex + delta + splatUrls.length) % splatUrls.length;
  loadSplat(splatUrls[currentSplatIndex]);

  // Haptics
  try {
    const c = renderer.xr.getController(0);
    const gp = c?.gamepad;
    if (gp?.hapticActuators?.length) gp.hapticActuators[0].pulse(0.5, 50);
  } catch (e) {}
}

// Load first splat
loadSplat(splatUrls[currentSplatIndex]);

// ----------------- VR Controllers -----------------
const c1 = renderer.xr.getController(0);
c1.addEventListener('select', () => cycleSplat(1));
c1.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(c1);

const c2 = renderer.xr.getController(1);
c2.addEventListener('select', () => cycleSplat(1));
c2.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(c2);

// Small help
const help = document.createElement('div');
help.style.cssText =
  'position:fixed;left:8px;bottom:8px;padding:6px;background:rgba(0,0,0,.5);color:#fff;font-size:12px;border-radius:4px;z-index:999;';
help.innerText = 'VR: trigger = next splat, squeeze = previous.';
document.body.appendChild(help);

// ----------- Render Loop (Spark handles XR cameras) -----------
renderer.setAnimationLoop((time, xrFrame) => {
  // Three.js renders normal objects (controllers)
  renderer.render(scene, camera);
});

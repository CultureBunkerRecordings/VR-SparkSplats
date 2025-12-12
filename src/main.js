import * as THREE from 'three';
import { SparkRenderer, SplatMesh, VRButton } from '@sparkjsdev/spark';

// ------- Scene (only for UI/controllers/etc) -------
const scene = new THREE.Scene();

// Dummy camera (Spark provides the XR camera internally)
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 0, 1);

// ------- Three.js Renderer -------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;

// Quest 2 stability
renderer.xr.setFramebufferScaleFactor(1.0);

document.body.appendChild(renderer.domElement);

// VR button
const vrButton = VRButton.createButton(renderer);
if (vrButton instanceof HTMLElement) document.body.appendChild(vrButton);

// Responsive resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ------- Spark Renderer (this owns splats!) -------
const spark = new SparkRenderer({ renderer, maxStdDev: Math.sqrt(5) });

// Spark renderer must be in the scene graph
scene.add(spark);

// ------------------ Splat Manager ------------------
const splatUrls = [
  './gs_TheseusAndMinotaurLuma.splat',
  './gs_Elephant.splat',
  './gs_Eistiens.splat'
];

let currentSplatIndex = 0;
let currentSplat = null;

// Dispose safely
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
  currentSplat.rotation.set(Math.PI, 0, 0);

  // IMPORTANT: Add splats to SparkRenderer, not scene
  spark.add(currentSplat);
}

// Change splat
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

// ----------------- VR Controller Input -----------------
const c1 = renderer.xr.getController(0);
c1.addEventListener('select', () => cycleSplat(1));
c1.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(c1);

const c2 = renderer.xr.getController(1);
c2.addEventListener('select', () => cycleSplat(1));
c2.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(c2);

// Keyboard fallback
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowRight' || e.code === 'Space') cycleSplat(1);
  else if (e.code === 'ArrowLeft') cycleSplat(-1);
});

// UI help
const help = document.createElement('div');
help.style.cssText =
  'position:fixed;left:8px;bottom:8px;padding:6px;background:rgba(0,0,0,.5);color:#fff;font-size:12px;border-radius:4px;z-index:999;';
help.innerText = 'VR: trigger = next splat, squeeze = previous.';
document.body.appendChild(help);

// ----------------- Render Loop -----------------
// NO spark.render() call — Spark renders automatically
renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});

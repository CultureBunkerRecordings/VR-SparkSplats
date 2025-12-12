import * as THREE from 'three';
import { SparkRenderer, SplatMesh, VRButton } from '@sparkjsdev/spark';

// ------- Scene, Camera, Renderer -------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  100
);
camera.position.set(0, 0, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFramebufferScaleFactor(1.0); // keep stable on Quest 2

// Local frame for stabilization
const localFrame = new THREE.Group();
scene.add(localFrame);
localFrame.add(camera);

// Spark renderer
const spark = new SparkRenderer({ renderer, maxStdDev: Math.sqrt(5) });
localFrame.add(spark);

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

// ------------------ Splat Manager ------------------
const splatUrls = [
  './gs_TheseusAndMinotaurLuma.splat',
  './gs_Elephant.splat',
  './gs_Eistiens.splat'
];

let currentSplatIndex = 0;
let currentSplat = null;

// Dispose a splat safely
function disposeSplat(s) {
  if (!s) return;
  if (s.material) s.material.dispose();
  if (s.geometry) s.geometry.dispose();
  s.parent?.remove(s);
}

// Load a splat by URL
function loadSplat(url) {
  // Dispose previous
  disposeSplat(currentSplat);

  // Create new SplatMesh
  currentSplat = new SplatMesh({ url });
  currentSplat.position.set(0, 0, -2);
  currentSplat.rotation.set(Math.PI, 0, 0);
  localFrame.add(currentSplat);
}

// Cycle to next/previous splat
function cycleSplat(delta = 1) {
  currentSplatIndex = (currentSplatIndex + delta + splatUrls.length) % splatUrls.length;
  loadSplat(splatUrls[currentSplatIndex]);

  // Haptic feedback (best-effort)
  try {
    const controller = renderer.xr.getController(0);
    if (!controller) return;
    const gp = controller.gamepad;
    if (gp?.hapticActuators?.length) {
      gp.hapticActuators[0].pulse(0.5, 50);
    } else if (gp?.vibrationActuator) {
      gp.vibrationActuator.playEffect('dual-rumble', { duration: 50, strongMagnitude: 0.5, weakMagnitude: 0.5 });
    }
  } catch (e) {}
}

// Load first splat on start
loadSplat(splatUrls[currentSplatIndex]);

// ----------------- VR Controllers -----------------
const controller = renderer.xr.getController(0);
controller.addEventListener('select', () => cycleSplat(1));
controller.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(controller);

const controller2 = renderer.xr.getController(1);
controller2.addEventListener('select', () => cycleSplat(1));
controller2.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(controller2);

// Keyboard fallback
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowRight' || e.code === 'Space') cycleSplat(1);
  else if (e.code === 'ArrowLeft') cycleSplat(-1);
});

// Help overlay
const help = document.createElement('div');
help.style.cssText = 'position:fixed;left:8px;bottom:8px;padding:6px;background:rgba(0,0,0,.5);color:#fff;font-size:12px;border-radius:4px;z-index:999;';
help.innerText = 'VR: trigger = next splat, squeeze = previous.';
document.body.appendChild(help);

// ----------- Quest-2 Stabilization Block -----------
let lastCameraPos = new THREE.Vector3();
let threshold = 0.2;

renderer.setAnimationLoop((time, xrFrame) => {
  // Local frame stabilization for Quest 2
  if (lastCameraPos.distanceTo(camera.position) > threshold) {
    localFrame.position.copy(camera.position).multiplyScalar(-1);
  }
  lastCameraPos.copy(camera.position);

  renderer.render(scene, camera);
});

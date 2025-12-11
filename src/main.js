import * as THREE from 'three';
import { SparkRenderer, SplatMesh, VRButton } from '@sparkjsdev/spark';

// ------- Scene, Camera, Renderer -------
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,      // wider near
  100        // bigger far (better for splats)
);
camera.position.set(0, 1.6, 2);

// Basic renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFramebufferScaleFactor(2.0);

// Create a local coordinate frame (this fixes Quest-2 jitter)
const localFrame = new THREE.Group();
scene.add(localFrame);

// Add camera + SparkRenderer to local frame
localFrame.add(camera);

// SparkRenderer
const spark = new SparkRenderer({ renderer });
localFrame.add(spark);

// Append visible canvas
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

const splatObjects = [];
let currentSplatIndex = -1;

function setActiveSplat(index) {
  if (!splatObjects.length) return;
  index = (index % splatObjects.length + splatObjects.length) % splatObjects.length;
  splatObjects.forEach((s, i) => (s.visible = (i === index)));
  currentSplatIndex = index;
}

function cycleSplat(delta = 1) {
  if (!splatObjects.length) return;
  setActiveSplat(currentSplatIndex + delta);

  // Haptics (best-effort)
  try {
    const controller = renderer.xr.getController(0);
    if (!controller) return;
    const gp = controller.gamepad;
    if (gp?.hapticActuators?.length) {
      gp.hapticActuators[0].pulse(0.5, 50);
    } else if (gp?.vibrationActuator) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        duration: 50,
        strongMagnitude: 0.5,
        weakMagnitude: 0.5
      });
    }
  } catch (e) {}
}

// Preload splats
for (const url of splatUrls) {
  const s = new SplatMesh({ url });
  s.visible = false;
  s.position.set(0, 0, -2);

  // REMOVE incorrect rotation
  // s.rotateX(Math.PI);   // ❌ Causes splat distortion & jitter
  s.rotation.set(Math.PI, 0, 0);


  scene.add(s);
  splatObjects.push(s);
}

if (splatObjects.length) setActiveSplat(0);

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

// Small on-screen help
const help = document.createElement('div');
help.style.cssText =
  'position:fixed;left:8px;bottom:8px;padding:6px;background:rgba(0,0,0,.5);color:#fff;font-size:12px;border-radius:4px;z-index:999;';
help.innerText = 'VR: trigger = next splat, squeeze = previous.';
document.body.appendChild(help);

// ----------- Quest-2 Stabilization Block -----------
let lastCameraPos = new THREE.Vector3();

renderer.setAnimationLoop((time, xrFrame) => {

  // Quest-2 tracking stabilization (Spark official sample)
  if (lastCameraPos.distanceTo(camera.position) > 0.5) {
    localFrame.position.copy(camera.position).multiplyScalar(-1);
  }
  lastCameraPos.copy(camera.position);

  renderer.render(scene, camera);
});

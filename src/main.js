import * as THREE from 'three';
import { SparkRenderer, SplatMesh, VRButton } from '@sparkjsdev/spark';

// ...existing code...
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 10);
camera.position.set(0, 1.6, 2);

// basic renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFramebufferScaleFactor(2.0); // or 2.0


// SparkRenderer - add to scene so sparks render
const spark = new SparkRenderer({
  renderer: renderer,
});
scene.add(spark);

// append the renderer canvas to the DOM so you can see it
document.body.appendChild(renderer.domElement);

// add a single VR button only
const vrButton = VRButton.createButton(renderer);
if (vrButton instanceof HTMLElement) {
  document.body.appendChild(vrButton);
}

// responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --------------- Splat manager (preload + swap) ------------------
const splatUrls = [
  './gs_TheseusAndMinotaurLuma.splat',
  './gs_Elephant.splat',
  './gs_Eistiens.splat'   // Add your additional files here
];

const splatObjects = [];
let currentSplatIndex = -1;

function setActiveSplat(index) {
  if (!splatObjects.length) return;
  index = (index % splatObjects.length + splatObjects.length) % splatObjects.length;
  splatObjects.forEach((s, i) => s.visible = (i === index));
  currentSplatIndex = index;
}

// cycle forward or backward
function cycleSplat(delta = 1) {
  if (!splatObjects.length) return;
  setActiveSplat(currentSplatIndex + delta);

  // haptic feedback (best-effort)
  try {
    const controller = renderer.xr.getController(0);
    if (!controller) return;
    const gp = controller.gamepad;
    if (gp && gp.hapticActuators && gp.hapticActuators.length) {
      gp.hapticActuators[0].pulse(0.5, 50);
    } else if (gp && gp.vibrationActuator) {
      gp.vibrationActuator.playEffect('dual-rumble', { duration: 50, strongMagnitude: 0.5, weakMagnitude: 0.5 });
    }
  } catch (e) {
    // ignore haptics errors
  }
}

// preload splats and add to scene
for (const url of splatUrls) {
  const s = new SplatMesh({ url });
  s.visible = false;
  s.position.set(0, 0, -2);
  s.rotateX(Math.PI);
  //s.rotateY(Math.PI / 2);
  scene.add(s);
  splatObjects.push(s);
}

// show the first splat after loading attempt (if any)
if (splatObjects.length) {
  setActiveSplat(0);
}

// -------------- Controller inputs ------------------
// primary "select" = cycle forward
const controller = renderer.xr.getController(0);
controller.addEventListener('select', () => cycleSplat(1));
controller.addEventListener('squeeze', () => cycleSplat(-1)); // squeeze to go back
scene.add(controller);

// optional second controller
const controller2 = renderer.xr.getController(1);
controller2.addEventListener('select', () => cycleSplat(1));
controller2.addEventListener('squeeze', () => cycleSplat(-1));
scene.add(controller2);

// keyboard fallback for non-VR
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowRight' || e.code === 'Space') cycleSplat(1);
  else if (e.code === 'ArrowLeft') cycleSplat(-1);
});

// small on-screen help
const help = document.createElement('div');
help.style.cssText = 'position:fixed;left:8px;bottom:8px;padding:6px;background:rgba(0,0,0,.5);color:#fff;font-size:12px;border-radius:4px;z-index:999;';
help.innerText = 'VR: press controller trigger to cycle; squeeze to go back. Keyboard: ← → Space';
document.body.appendChild(help);

// --------------- render loop --------------------
renderer.setAnimationLoop(() => {
  // fix for stutter
  spark.setLocalSpaceFromCamera(camera);
  // render scene
  renderer.render(scene, camera);
});
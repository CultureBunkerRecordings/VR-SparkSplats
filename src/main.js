import * as THREE from "three";
import { SparkRenderer, SplatMesh, VRButton } from "@sparkjsdev/spark";
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";




document.addEventListener("DOMContentLoaded", () => {
  init();
});

function init() {
  // =====================================================
  // Scene & Camera
  // =====================================================
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );


  // IMPORTANT: non-XR needs an actual camera pose
  camera.position.set(0, 0, 0);

  // =====================================================
  // Renderer
  // =====================================================
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setFramebufferScaleFactor(1.0);

  document.body.appendChild(renderer.domElement);

  // =====================================================
  // Desktop Controls (Non-XR fallback)
  // =====================================================
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.target.set(0, 0, -2);
  controls.update();

  // =====================================================
  // VR Button
  // =====================================================
  const vrButton = VRButton.createButton(renderer, {
    optionalFeatures: [
      "local-floor",
      "hand-tracking",
      "bounded-floor",
    ],
  });

  document.body.appendChild(vrButton);

  // Disable desktop controls while in XR
  renderer.xr.addEventListener("sessionstart", () => {
    controls.enabled = false;
  });

  renderer.xr.addEventListener("sessionend", () => {
    controls.enabled = true;
  });

  // =====================================================
  // Resize
  // =====================================================
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // =====================================================
  // Spark Renderer
  // =====================================================
  const spark = new SparkRenderer({
    renderer,
    maxStdDev: Math.sqrt(5),
  });

  scene.add(spark);

  // =====================================================
  // Splat Manager
  // =====================================================
  const splatUrls = [
    "./gs_Peter.splat",
    "./gs_Dead_Christ.splat",
    "./gs_TheseusAndMinotaurLuma.splat",
    "./gs_Elephant.splat",
    "./gs_Eistiens.splat",
  ];

  let index = 0;
  let currentSplat = null;

  function disposeSplat(mesh) {
    if (!mesh) return;
    mesh.parent?.remove(mesh);
    mesh.geometry?.dispose?.();
    mesh.material?.dispose?.();
  }

  function loadSplat(i) {
    disposeSplat(currentSplat);

    const mesh = new SplatMesh({ url: splatUrls[i] });
    const contentRoot = new THREE.Group();
    contentRoot.position.set(0, 0, -2); // XR-safe placement
    scene.add(contentRoot);

    mesh.rotation.set(Math.PI, 0, 0);

    contentRoot.add(mesh);
    currentSplat = mesh;
  }

  loadSplat(index);

  function cycleSplat(delta) {
    index = (index + delta + splatUrls.length) % splatUrls.length;
    loadSplat(index);
  }

  // =====================================================
  // XR Hands
  // =====================================================
  renderer.xr.addEventListener("sessionstart", () => {
    const factory = new XRHandModelFactory();

    const handL = renderer.xr.getHand(0);
    const handR = renderer.xr.getHand(1);

    handL.add(factory.createHandModel(handL, "mesh"));
    handR.add(factory.createHandModel(handR, "mesh"));

    scene.add(handL);
    scene.add(handR);

    handR.addEventListener("pinchstart", () => cycleSplat(1));
    handL.addEventListener("pinchstart", () => cycleSplat(-1));
  });

  // =====================================================
  // Keyboard fallback
  // =====================================================
  window.addEventListener("keydown", (e) => {
    if (e.code === "ArrowRight" || e.code === "Space") cycleSplat(1);
    if (e.code === "ArrowLeft") cycleSplat(-1);
  });

  // =====================================================
  // Render Loop
  // =====================================================
  renderer.setAnimationLoop(() => {
    // Only update controls when NOT in XR
    if (!renderer.xr.isPresenting) {
      controls.update();
    }

    renderer.render(scene, camera);
  });
}

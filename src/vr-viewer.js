import * as THREE from "three";
import { SparkRenderer, SplatMesh, VRButton } from "@sparkjsdev/spark";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { XRHandModelFactory } from "three/examples/jsm/webxr/XRHandModelFactory.js";

export function mountVrViewer(root) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.xr.setFramebufferScaleFactor(1);
  root.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, -2);
  controls.update();

  const vrButton = VRButton.createButton(renderer, {
    optionalFeatures: ["local-floor", "hand-tracking", "bounded-floor"],
  });
  if (vrButton instanceof HTMLElement) root.appendChild(vrButton);

  const spark = new SparkRenderer({ renderer, maxStdDev: Math.sqrt(5) });
  scene.add(spark);

  const splatUrls = [
    "/gs_Peter.splat",
    "/gs_Dead_Christ.splat",
    "/gs_TheseusAndMinotaurLuma.splat",
    "/gs_Elephant.splat",
    "/gs_Eistiens.splat",
    "/RobotSplat.splat",
    "/EpsteinWoman.splat",
  ];
  let index = 0;
  let currentRoot = null;

  function loadSplat(nextIndex) {
    currentRoot?.removeFromParent();
    currentRoot = new THREE.Group();
    currentRoot.position.set(0, 0, -2);
    const mesh = new SplatMesh({ url: splatUrls[nextIndex] });
    mesh.rotation.x = Math.PI;
    currentRoot.add(mesh);
    scene.add(currentRoot);
  }

  function cycleSplat(delta) {
    index = (index + delta + splatUrls.length) % splatUrls.length;
    loadSplat(index);
  }

  const handleKeyDown = (event) => {
    if (event.code === "ArrowRight" || event.code === "Space") cycleSplat(1);
    if (event.code === "ArrowLeft") cycleSplat(-1);
  };
  const handleResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  const handleSessionStart = () => { controls.enabled = false; };
  const handleSessionEnd = () => { controls.enabled = true; };

  const controllerLeft = renderer.xr.getController(0);
  const controllerRight = renderer.xr.getController(1);
  controllerLeft.addEventListener("select", () => cycleSplat(-1));
  controllerRight.addEventListener("select", () => cycleSplat(1));
  scene.add(controllerLeft, controllerRight);

  const handFactory = new XRHandModelFactory();
  const handLeft = renderer.xr.getHand(0);
  const handRight = renderer.xr.getHand(1);
  handLeft.add(handFactory.createHandModel(handLeft, "mesh"));
  handRight.add(handFactory.createHandModel(handRight, "mesh"));
  handLeft.addEventListener("pinchstart", () => cycleSplat(-1));
  handRight.addEventListener("pinchstart", () => cycleSplat(1));
  scene.add(handLeft, handRight);

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("resize", handleResize);
  renderer.xr.addEventListener("sessionstart", handleSessionStart);
  renderer.xr.addEventListener("sessionend", handleSessionEnd);
  loadSplat(index);
  renderer.setAnimationLoop(() => {
    if (!renderer.xr.isPresenting) controls.update();
    renderer.render(scene, camera);
  });

  return () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("resize", handleResize);
    renderer.xr.removeEventListener("sessionstart", handleSessionStart);
    renderer.xr.removeEventListener("sessionend", handleSessionEnd);
    controls.dispose();
    currentRoot?.traverse((object) => {
      object.geometry?.dispose?.();
      object.material?.dispose?.();
    });
    renderer.dispose();
    vrButton?.remove();
    renderer.domElement.remove();
  };
}
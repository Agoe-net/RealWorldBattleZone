import * as THREE from 'three';
import '../style.css';

// REALWORLD BATTLE ZONE - WEB/PWA PROTOTYPE

const game = document.querySelector('#game');
const statusText = document.querySelector('#status');
const miniMapElement = document.querySelector('#minimap');
const joystick = document.querySelector('#joystick');
const stick = document.querySelector('#stick');
const jumpButton = document.querySelector('#jumpBtn');
const installButton = document.querySelector('#installBtn');

if (!game) throw new Error('Missing #game element in index.html');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (error) {
  if (statusText) statusText.textContent = 'This browser cannot start WebGL.';
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.touchAction = 'none';
game.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bc9ed);
scene.fog = new THREE.Fog(0x8bc9ed, 65, 190);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 500);

scene.add(new THREE.HemisphereLight(0xffffff, 0x64744c, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(35, 55, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// Ground and road
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(250, 250),
  new THREE.MeshStandardMaterial({ color: 0x668d49, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 190),
  new THREE.MeshStandardMaterial({ color: 0x44484a, roughness: 1 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.025;
road.receiveShadow = true;
scene.add(road);

for (let z = -90; z < 95; z += 12) {
  const marking = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.035, 5),
    new THREE.MeshStandardMaterial({ color: 0xf4f0d8 })
  );
  marking.position.set(0, 0.06, z);
  scene.add(marking);
}

// Player model
const player = new THREE.Group();
scene.add(player);

const mat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
const skin = mat(0xb97850);
const shirt = mat(0x2674a8);
const pants = mat(0x303746);
const shoes = mat(0x202020);
const hair = mat(0x21170f);

function addPart(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

addPart(player, new THREE.BoxGeometry(0.65, 0.85, 0.35), shirt, 0, 1.45, 0);
addPart(player, new THREE.CylinderGeometry(0.12, 0.13, 0.2, 12), skin, 0, 1.98, 0);
addPart(player, new THREE.SphereGeometry(0.25, 18, 14), skin, 0, 2.25, 0);
addPart(player, new THREE.SphereGeometry(0.255, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), hair, 0, 2.32, 0);

function createLimb(x, y, material, isArm) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, 0);
  player.add(pivot);
  const length = isArm ? 0.65 : 0.75;
  addPart(pivot, new THREE.CylinderGeometry(isArm ? 0.105 : 0.14, isArm ? 0.09 : 0.11, length, 12), material, 0, -length / 2, 0);
  if (isArm) {
    addPart(pivot, new THREE.SphereGeometry(0.11, 12, 10), skin, 0, -0.65, 0);
  } else {
    addPart(pivot, new THREE.BoxGeometry(0.24, 0.14, 0.38), shoes, 0, -0.76, -0.08);
  }
  return pivot;
}

const leftArm = createLimb(-0.42, 1.78, shirt, true);
const rightArm = createLimb(0.42, 1.78, shirt, true);
const leftLeg = createLimb(-0.19, 1.05, pants, false);
const rightLeg = createLimb(0.19, 1.05, pants, false);

// Village buildings and simple house collision
const obstacles = [];

function createHouse(x, z, width = 7, height = 5, depth = 7) {
  const house = new THREE.Group();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    mat(0xc49b70)
  );
  wall.position.y = height / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  house.add(wall);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(width * 0.78, 2.5, 4),
    mat(0x75452d)
  );
  roof.position.y = height + 1;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  house.add(roof);

  house.position.set(x, 0, z);
  scene.add(house);
  obstacles.push({ x, z, halfX: width / 2 + 0.65, halfZ: depth / 2 + 0.65 });
}

createHouse(-15, -15);
createHouse(17, -20);
createHouse(-20, 15);
createHouse(20, 18, 9, 7, 8);
createHouse(-35, -35, 9, 6, 9);
createHouse(35, 35, 9, 6, 9);

// Trees
function createTree(x, z) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.4, 8), mat(0x684126));
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  tree.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.45, 3.8, 8), mat(0x236b35));
  crown.position.y = 4;
  crown.castShadow = true;
  tree.add(crown);
  tree.position.set(x, 0, z);
  scene.add(tree);
}
for (let i = 0; i < 32; i++) {
  const x = (Math.random() - 0.5) * 110;
  const z = (Math.random() - 0.5) * 110;
  if (Math.abs(x) > 9) createTree(x, z);
}

// Movement
let moveX = 0;
let moveY = 0;
let verticalSpeed = 0;
let grounded = true;
let moving = false;
const speed = 8;
const gravity = 18;
const jumpPower = 7;
let yaw = 0;
let pitch = 0.24;
const cameraDistance = 8;
const clock = new THREE.Clock();

const PLAYER_RADIUS = 0.42;
const WORLD_LIMIT = 119;

function collides(x, z) {
  // Expand each building's footprint by the player's radius so the body
  // cannot clip through walls at the corners.
  return obstacles.some(o =>
    x > o.x - o.halfX - PLAYER_RADIUS &&
    x < o.x + o.halfX + PLAYER_RADIUS &&
    z > o.z - o.halfZ - PLAYER_RADIUS &&
    z < o.z + o.halfZ + PLAYER_RADIUS
  );
}

function updatePlayer(dt) {
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const direction = new THREE.Vector3()
    .addScaledVector(right, moveX)
    .addScaledVector(forward, moveY);

  moving = direction.lengthSq() > 0.01;
  if (moving) {
    direction.clampLength(0, 1);
    const distance = speed * dt;
    // Small substeps prevent fast movement from tunnelling through walls.
    const steps = Math.max(1, Math.ceil(distance / 0.2));
    const stepX = direction.x * distance / steps;
    const stepZ = direction.z * distance / steps;

    for (let i = 0; i < steps; i++) {
      const nextX = THREE.MathUtils.clamp(player.position.x + stepX, -WORLD_LIMIT, WORLD_LIMIT);
      const nextZ = THREE.MathUtils.clamp(player.position.z + stepZ, -WORLD_LIMIT, WORLD_LIMIT);

      if (!collides(nextX, player.position.z)) player.position.x = nextX;
      if (!collides(player.position.x, nextZ)) player.position.z = nextZ;
    }
    player.rotation.y = Math.atan2(direction.x, direction.z);
  }

  if (!grounded || verticalSpeed > 0) {
    verticalSpeed -= gravity * dt;
    player.position.y += verticalSpeed * dt;
    if (player.position.y <= 0) {
      player.position.y = 0;
      verticalSpeed = 0;
      grounded = true;
    }
  }
}

function animateCharacter(t) {
  const swing = moving && grounded ? Math.sin(t * 10) * 0.62 : 0;
  leftArm.rotation.x = swing;
  rightArm.rotation.x = -swing;
  leftLeg.rotation.x = -swing;
  rightLeg.rotation.x = swing;
}

function updateCamera() {
  const horizontal = Math.cos(pitch) * cameraDistance;
  camera.position.set(
    player.position.x + Math.sin(yaw) * horizontal,
    player.position.y + 3 + Math.sin(pitch) * cameraDistance,
    player.position.z + Math.cos(yaw) * horizontal
  );
  camera.lookAt(player.position.x, player.position.y + 1.3, player.position.z);
}

// Camera drag: the joystick and jump button are separate UI layers,
// so camera input only starts on the 3D canvas.
let dragging = false;
let cameraPointerId = null;
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener('pointerdown', event => {
  if (event.button !== undefined && event.button !== 0) return;
  if (cameraPointerId !== null) return;
  event.preventDefault();
  dragging = true;
  cameraPointerId = event.pointerId;
  lastX = event.clientX;
  lastY = event.clientY;
  try { renderer.domElement.setPointerCapture(event.pointerId); } catch (_) {}
}, { passive: false });

renderer.domElement.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== cameraPointerId) return;
  event.preventDefault();
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  yaw -= dx * 0.005;
  pitch = THREE.MathUtils.clamp(pitch + dy * 0.0035, -0.12, 0.85);
  lastX = event.clientX;
  lastY = event.clientY;
}, { passive: false });

function stopCameraDrag(event) {
  if (event && cameraPointerId !== null && event.pointerId !== cameraPointerId) return;
  dragging = false;
  cameraPointerId = null;
}
renderer.domElement.addEventListener('pointerup', stopCameraDrag);
renderer.domElement.addEventListener('pointercancel', stopCameraDrag);
renderer.domElement.addEventListener('lostpointercapture', stopCameraDrag);

// Mobile movement joystick
if (joystick) {
  const radius = 43;
  const deadZone = 0.08;
  let activePointer = null;

  function updateStick(event) {
    const rect = joystick.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > radius) {
      dx = dx / length * radius;
      dy = dy / length * radius;
    }
    let x = dx / radius;
    let y = -dy / radius;
    if (Math.hypot(x, y) < deadZone) {
      x = 0;
      y = 0;
      dx = 0;
      dy = 0;
    }
    moveX = x;
    moveY = y;
    if (stick) stick.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  function resetStick(event) {
    if (event && activePointer !== null && event.pointerId !== activePointer) return;
    activePointer = null;
    moveX = 0;
    moveY = 0;
    if (stick) stick.style.transform = 'translate(0px, 0px)';
  }

  joystick.addEventListener('pointerdown', event => {
    if (activePointer !== null) return;
    event.preventDefault();
    activePointer = event.pointerId;
    try { joystick.setPointerCapture(event.pointerId); } catch (_) {}
    updateStick(event);
  }, { passive: false });
  joystick.addEventListener('pointermove', event => {
    if (event.pointerId === activePointer) {
      event.preventDefault();
      updateStick(event);
    }
  }, { passive: false });
  joystick.addEventListener('pointerup', resetStick);
  joystick.addEventListener('pointercancel', resetStick);
  joystick.addEventListener('lostpointercapture', resetStick);
}

// Jump
function jump() {
  if (grounded) {
    verticalSpeed = jumpPower;
    grounded = false;
  }
}
if (jumpButton) {
  jumpButton.addEventListener('pointerdown', event => {
    event.preventDefault();
    jump();
  }, { passive: false });
}

// Keyboard controls are useful when testing on a computer; mobile remains
// fully touch-controlled.
const keys = new Set();
window.addEventListener('keydown', event => {
  keys.add(event.code);
  if (event.code === 'Space') jump();
});
window.addEventListener('keyup', event => keys.delete(event.code));
function updateKeyboardInput() {
  const keyX = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  const keyY = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  if (keyX || keyY) {
    moveX = keyX;
    moveY = keyY;
  }
}
window.addEventListener('blur', () => {
  keys.clear();
  moveX = 0;
  moveY = 0;
  stopCameraDrag();
});

// Mini map renderer (separate small viewport)
let miniRenderer = null;
let miniCamera = null;
if (miniMapElement) {
  miniCamera = new THREE.OrthographicCamera(-38, 38, 38, -38, 0.1, 200);
  miniCamera.up.set(0, 0, -1);
  miniCamera.position.set(0, 90, 0);
  miniCamera.lookAt(0, 0, 0);
  miniRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  miniRenderer.setPixelRatio(1);
  miniRenderer.setSize(118, 118);
  miniMapElement.appendChild(miniRenderer.domElement);
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// PWA install prompt
let installPrompt = null;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.hidden = false;
});
if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
}
window.addEventListener('appinstalled', () => {
  if (installButton) installButton.hidden = true;
});

// Service worker
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('RWBZ service worker registered'))
      .catch(error => console.warn('Service worker registration failed:', error));
  });
}

// Main loop
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  updateKeyboardInput();
  updatePlayer(dt);
  animateCharacter(elapsed);
  updateCamera();
  renderer.render(scene, camera);

  if (miniRenderer && miniCamera) {
    miniCamera.position.set(player.position.x, 90, player.position.z);
    miniCamera.lookAt(player.position.x, 0, player.position.z);
    miniRenderer.render(scene, miniCamera);
  }
}
updateCamera();
animate();

if (statusText) statusText.textContent = 'V3.1 Ready - Move, rotate camera and jump';
console.log('RealWorldBattleZone V3.1 loaded');

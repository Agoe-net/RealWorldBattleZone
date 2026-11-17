import * as THREE from 'three';
import '../style.css';
import { createMultiplayer } from './multiplayer.js';
import { createJamshedpurMap } from './world/jamshedpur.js';
import { createOSMMap } from './world/osm-map.js';
import { createGreenery } from './world/greenery.js';
import { createInfrastructure } from './world/infrastructure.js';
import { createTraffic } from './vehicles/traffic.js';
import { createEnterableTestHouse } from './world/enterable-building.js';

// REALWORLD BATTLE ZONE - WEB/PWA PROTOTYPE

const game = document.querySelector('#game');
const statusText = document.querySelector('#status');
const miniMapElement = document.querySelector('#minimap');
const joystick = document.querySelector('#joystick');
const stick = document.querySelector('#stick');
const jumpButton = document.querySelector('#jumpBtn');
const installButton = document.querySelector('#installBtn');

if (!game) throw new Error('Missing #game element in index.html');

window.addEventListener('error', e => console.error('RWBZ ERROR:', e.message));
window.addEventListener('unhandledrejection', e => console.error('RWBZ PROMISE ERROR:', e.reason));

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
} catch (error) {
  if (statusText) statusText.textContent = 'This browser cannot start WebGL.';
  throw error;
}


const cpuCores = navigator.hardwareConcurrency || 8;
const deviceMemory = navigator.deviceMemory || 8;
const mobileLowEnd = cpuCores <= 4 || deviceMemory <= 4;
renderer.setPixelRatio(mobileLowEnd ? 0.7 : 0.9);

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.domElement.style.touchAction = 'none';
game.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bc9ed);
scene.fog = new THREE.Fog(0x8bc9ed, 650, 1300);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 2000);

const skyLight = new THREE.HemisphereLight(0xffffff, 0x64744c, 1.8);
scene.add(skyLight);
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(35, 55, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);

scene.add(sun);
let osmMap = null;

// MOON AND NIGHT STARS
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(7, 20, 16),
  new THREE.MeshBasicMaterial({ color: 0xfff1c2 })
);
moon.position.set(-90, 75, -120);
scene.add(moon);

const moonLight = new THREE.DirectionalLight(0xb9cfff, 0);
moonLight.position.set(-90, 75, -120);
scene.add(moonLight);


const starPositions = [];
for (let i = 0; i < 250; i++) {
  starPositions.push(
    (Math.random() - 0.5) * 900,
    80 + Math.random() * 180,
    (Math.random() - 0.5) * 900
  );
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(starPositions, 3)
);

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.5,
  transparent: true,
  opacity: 0
});

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// REALISTIC DAY AND NIGHT CYCLE
const daySky = new THREE.Color(0x8bc9ed);
const nightSky = new THREE.Color(0x07152f);
const sunsetSky = new THREE.Color(0xe99465);
const daySun = new THREE.Color(0xffffff);
const sunsetSun = new THREE.Color(0xffa45c);
const currentSky = new THREE.Color();

function updateDayNight(elapsed) {
  const cycle = (elapsed / 240) % 1;
  const angle = cycle * Math.PI * 2 - Math.PI / 2;

  const sunHeight = Math.sin(angle);
  const daylight = Math.max(0, sunHeight);
  const night = 1 - daylight;

  moon.visible = night > 0.15;
  moonLight.intensity = night * 0.35;
  moonLight.position.copy(moon.position);
  moon.position.x = -Math.cos(angle) * 90;
  moon.position.y = 75 + Math.sin(angle) * 20;
  starMaterial.opacity =
    night * (0.65 + Math.sin(elapsed * 2.5) * 0.2);
  // Street-light materials are updated on a timer in the main loop.
  const twilight = Math.max(0, 1 - Math.abs(daylight - 0.12) / 0.12);

  sun.position.set(
    Math.cos(angle) * 100,
    sunHeight * 100,
    25
  );

  sun.intensity = 0.12 + daylight * 1.9;
  sun.color.copy(daySun).lerp(sunsetSun, twilight);

  skyLight.intensity = 0.25 + daylight * 1.55;

  currentSky.copy(nightSky).lerp(daySky, daylight);
  currentSky.lerp(sunsetSky, twilight * 0.75);

  scene.background.copy(currentSky);
  scene.fog.color.copy(currentSky);
}


// Player model
const player = new THREE.Group();
scene.add(player);
const multiplayer = createMultiplayer({ scene, player, statusText });

const mat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
const skin = mat(0xb97850);
const shirt = mat(0x2674a8);
const pants = mat(0x303746);
const shoes = mat(0x202020);
const hair = mat(0x21170f);

function addPart(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
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
function createLeg(x, y) {
  const hip = new THREE.Group();
  hip.position.set(x, y, 0);
  player.add(hip);

  // Upper leg
  addPart(
    hip,
    new THREE.CylinderGeometry(0.14, 0.12, 0.40, 14),
    pants, 0, -0.20, 0
  );

  // Knee pivot and lower leg
  const knee = new THREE.Group();
  knee.position.set(0, -0.40, 0);
  hip.add(knee);

  addPart(
    knee,
    new THREE.CylinderGeometry(0.12, 0.105, 0.38, 14),
    pants, 0, -0.19, 0
  );

  // Shoe
  addPart(
    knee,
    new THREE.BoxGeometry(0.24, 0.14, 0.38),
    shoes, 0, -0.40, -0.08
  );

  return { hip, knee };
}

const leftLeg = createLeg(-0.19, 1.05);
const rightLeg = createLeg(0.19, 1.05);



// Jamshedpur city map and building collision
const obstacles = createJamshedpurMap(scene);
const testHouse = createEnterableTestHouse(scene);
const infrastructure = createInfrastructure(scene);
createGreenery(scene);
const traffic = createTraffic(scene);
createOSMMap(scene)
  .then(map => { osmMap = map; })
  .catch(error => console.error('OSM MAP ERROR:', error));

// Movement
let moveX = 0;
let moveY = 0;
let verticalSpeed = 0;
let grounded = true;
let moving = false;
let speed = 8;
let sprinting = false;
let aiming = false;
const gravity = 18;
const jumpPower = 7;
let yaw = 0;
let pitch = 0.24;
let cameraYaw = 0;
let cameraPitch = 0.24;
const cameraDistance = 8;
const clock = new THREE.Clock();

const PLAYER_RADIUS = 0.42;
const WORLD_LIMIT = 470;

function collides(x, z) {
  const cityCollision = obstacles.some(o =>
    x > o.x - o.halfX - PLAYER_RADIUS &&
    x < o.x + o.halfX + PLAYER_RADIUS &&
    z > o.z - o.halfZ - PLAYER_RADIUS &&
    z < o.z + o.halfZ + PLAYER_RADIUS
  );

  // Test house walls: ground-floor doorway remains open.
  const feetY = player.position.y;
  const intersectsHouseWalls = feetY < 3.2 && feetY + 2.5 > 0;

  if (!intersectsHouseWalls) return cityCollision;

  const r = PLAYER_RADIUS;
  const insideX = x > 27 - r && x < 43 + r;
  const insideZ = z > 27 - r && z < 43 + r;

  const backWall = insideX && Math.abs(z - 27) < 0.35 + r;
  const leftWall = insideZ && Math.abs(x - 27) < 0.35 + r;
  const rightWall = insideZ && Math.abs(x - 43) < 0.35 + r;

  // Front wall has a doorway from x=33.8 to x=36.2.
  const frontWallLine = Math.abs(z - 43) < 0.35 + r;
  const frontLeft = x < 33.8 + r;
  const frontRight = x > 36.2 - r;
  const frontWall = insideX && frontWallLine && (frontLeft || frontRight);

  return cityCollision || backWall || leftWall || rightWall || frontWall;
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

let gaitBlend = 0;

function animateCharacter(t) {
  const target = moving && grounded ? 1 : 0;
  gaitBlend += (target - gaitBlend) * 0.14;

  const phase = t * 8;
  const swing = Math.sin(phase) * 0.48 * gaitBlend;

  leftArm.rotation.x = swing;
  rightArm.rotation.x = -swing;

  leftLeg.hip.rotation.x = swing;
  rightLeg.hip.rotation.x = -swing;

  // Natural knee bending during forward swing
  leftLeg.knee.rotation.x =
    Math.max(0, Math.sin(phase)) * 0.72 * gaitBlend;

  rightLeg.knee.rotation.x =
    Math.max(0, Math.sin(phase + Math.PI)) * 0.72 * gaitBlend;
}

function updateCamera() {
  // Smoothly follow the player's camera direction
  const angleDiff = Math.atan2(
    Math.sin(yaw - cameraYaw),
    Math.cos(yaw - cameraYaw)
  );
  cameraYaw += angleDiff * 0.18;
  cameraPitch += (pitch - cameraPitch) * 0.18;

  const distance = aiming ? 6 : 10;
  const targetY = player.position.y + 1.3;

  // Full 360-degree horizontal rotation + vertical camera look
  const horizontalDistance = Math.cos(cameraPitch) * distance;
  const offsetX = Math.sin(cameraYaw) * horizontalDistance;
  const offsetY = Math.sin(cameraPitch) * distance;
  const offsetZ = Math.cos(cameraYaw) * horizontalDistance;

  camera.position.set(
    player.position.x + offsetX,
    targetY + offsetY,
    player.position.z + offsetZ
  );

  camera.lookAt(
    player.position.x,
    targetY,
    player.position.z
  );
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
  yaw -= dx * 0.0035;
  pitch = THREE.MathUtils.clamp(pitch + dy * 0.0025, -0.35, 1.0);
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

// Sprint: hold the button to run faster.
const sprintButton = document.getElementById('sprintBtn');

if (sprintButton) {
  sprintButton.addEventListener('pointerdown', event => {
    event.preventDefault();
    sprinting = true;
    speed = 12;
    sprintButton.classList.add('active');
  });

  const stopSprint = () => {
    sprinting = false;
    speed = 8;
    sprintButton.classList.remove('active');
  };

  sprintButton.addEventListener('pointerup', stopSprint);
  sprintButton.addEventListener('pointercancel', stopSprint);
  sprintButton.addEventListener('lostpointercapture', stopSprint);
}

// Aim: toggle a closer third-person camera.
const aimButton = document.getElementById('aimBtn');

if (aimButton) {
  aimButton.addEventListener('click', () => {
    aiming = !aiming;
    aimButton.classList.toggle('active', aiming);
    aimButton.textContent = aiming ? '◎ AIM ON' : '◎ AIM';
  });
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
  sprinting = false;
  speed = 8;
  if (sprintButton) sprintButton.classList.remove('active');
  stopCameraDrag();
});

// Mini map renderer (separate small viewport)
let miniRenderer = null;
let miniCamera = null;
if (miniMapElement) {
  miniCamera = new THREE.OrthographicCamera(-130, 130, 130, -130, 0.1, 200);
  miniCamera.up.set(0, 0, -1);
  miniCamera.position.set(0, 180, 0);
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

let lastLightingUpdate = 0;
let lastMiniMapUpdate = 0;

// Main loop
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  updateDayNight(elapsed);
  if (osmMap && elapsed - lastLightingUpdate >= 0.25) {
    const cycle = (elapsed / 240) % 1;
    const daylight = Math.max(0, Math.sin(cycle * Math.PI * 2 - Math.PI / 2));
    osmMap.updateStreetLights(1 - daylight);
    lastLightingUpdate = elapsed;
  }
  updateKeyboardInput();
  updatePlayer(dt);
  multiplayer.update(dt);
  traffic.update(dt);
  infrastructure.update(elapsed);
  animateCharacter(elapsed);
  updateCamera();
  renderer.render(scene, camera);

  if (miniRenderer && miniCamera && elapsed - lastMiniMapUpdate >= 0.5) {
    miniCamera.position.set(player.position.x, 180, player.position.z);
    miniCamera.lookAt(player.position.x, 0, player.position.z);
    miniRenderer.render(scene, miniCamera);
    lastMiniMapUpdate = elapsed;
  }
}
updateCamera();
animate();

if (statusText) statusText.textContent = 'Ready - Move, rotate camera and jump';
console.log('RealWorldBattleZone optimized build loaded');

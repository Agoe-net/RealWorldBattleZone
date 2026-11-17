import * as THREE from 'three';

export function createEnterableTestHouse(scene) {
  const house = new THREE.Group();

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xd8c6a8,
    roughness: 0.9
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x77716a,
    roughness: 0.95
  });

  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x914b35,
    roughness: 0.9
  });

  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x56331f
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x77bddd,
    metalness: 0.25,
    roughness: 0.2
  });

  const cx = 35;
  const cz = 35;
  const width = 16;
  const depth = 16;
  const wallHeight = 3.2;
  const wall = 0.35;

  function block(w, h, d, x, y, z, material) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    house.add(mesh);
    return mesh;
  }

  // Ground floor
  block(width, 0.25, depth, cx, -0.125, cz, floorMat);

  // Back wall
  block(width, wallHeight, wall, cx, wallHeight / 2, cz - 8, wallMat);

  // Left and right walls
  block(wall, wallHeight, depth, cx - 8, wallHeight / 2, cz, wallMat);
  block(wall, wallHeight, depth, cx + 8, wallHeight / 2, cz, wallMat);

  // Front wall: leave a real doorway in the middle
  block(6.8, wallHeight, wall, cx - 4.6, wallHeight / 2, cz + 8, wallMat);
  block(6.8, wallHeight, wall, cx + 4.6, wallHeight / 2, cz + 8, wallMat);
  block(2.4, 0.5, wall, cx, 2.95, cz + 8, wallMat);

  // Door frame and door
  block(0.16, 2.5, 0.16, cx - 1.2, 1.25, cz + 8, doorMat);
  block(0.16, 2.5, 0.16, cx + 1.2, 1.25, cz + 8, doorMat);

  // Windows
  block(0.08, 1.15, 1.8, cx - 7.78, 2.0, cz, windowMat);
  block(0.08, 1.15, 1.8, cx + 7.78, 2.0, cz, windowMat);
  block(2.0, 1.15, 0.08, cx, 2.0, cz - 7.78, windowMat);

  // First-floor staircase: visible steps
  for (let i = 0; i < 14; i++) {
    const stepHeight = (i + 1) * 0.23;
    const step = block(
      2.2,
      stepHeight,
      0.65,
      cx + 4.4,
      stepHeight / 2,
      cz + 5.2 - i * 0.65,
      floorMat
    );
    step.receiveShadow = true;
  }

  // First-floor landing
  block(5, 0.22, 4, cx + 3.8, 3.2, cz - 5.5, floorMat);

  // Upper staircase
  for (let i = 0; i < 14; i++) {
    const stepHeight = 3.2 + (i + 1) * 0.23;
    block(
      2.2,
      stepHeight - 3.2,
      0.65,
      cx - 4.4,
      3.2 + (stepHeight - 3.2) / 2,
      cz - 5.2 + i * 0.65,
      floorMat
    );
  }

  // Rooftop
  block(width, 0.3, depth, cx, 6.4, cz, roofMat);

  // Roof access opening cover is intentionally omitted for testing.
  // The staircase and upper-floor collision will be connected next.

  scene.add(house);

  console.log('ENTERABLE TEST HOUSE MODEL CREATED');

  return house;
}

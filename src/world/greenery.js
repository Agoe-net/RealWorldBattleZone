import * as THREE from 'three';

export function createGreenery(scene) {
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x654126,
    roughness: 1
  });

  const leafMats = [
    new THREE.MeshStandardMaterial({ color: 0x174f25, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x267a35, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x398d40, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x559b45, roughness: 1 })
  ];

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x398b36 });

  function addTree(x, z, scale = 1, seed = 0) {
    const height = 3.5 * scale;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.13 * scale,
        0.24 * scale,
        height,
        9
      ),
      trunkMat
    );

    trunk.position.set(x, height / 2, z);
    trunk.castShadow = true;
    scene.add(trunk);

    // Main leafy crown
    for (let i = 0; i < 7; i++) {
      const angle = i * Math.PI * 2 / 7 + seed;
      const radius = (i === 0 ? 0 : 0.65) * scale;

      const crown = new THREE.Mesh(
        new THREE.IcosahedronGeometry(
          (0.85 + (i % 3) * 0.12) * scale,
          1
        ),
        leafMats[(i + seed) % leafMats.length]
      );

      crown.position.set(
        x + Math.cos(angle) * radius,
        height + (i === 0 ? 0.65 : 0.25 + (i % 3) * 0.35) * scale,
        z + Math.sin(angle) * radius
      );

      crown.castShadow = true;
      scene.add(crown);
    }
  }

  // Trees around the city
  const treePositions = [
    [-100, 1], [-80, 0], [-60, 9], [-40, 0],
    [-20, -10], [5, -22], [28, -30],
    [48, -46], [70, -63], [90, -82]
  ];

  treePositions.forEach(([x, z], i) => {
    addTree(x, z + 11, 0.9, i);
    addTree(x, z - 11, 0.85, i + 2);
  });

  // Additional small roadside trees
  for (let i = 0; i < 24; i++) {
    const x = -115 + i * 9;
    addTree(x, 65 + Math.sin(i) * 5, 0.65 + (i % 3) * 0.12, i);
  }

  // Flower beds
  function addFlowerBed(x, z) {
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.18, 1.5),
      grassMat
    );
    bed.position.set(x, 0.12, z);
    scene.add(bed);
  }

  addFlowerBed(-35, 22);
  addFlowerBed(15, -30);
  addFlowerBed(70, -43);

  console.log('REALISTIC CITY TREES loaded');
}

import * as THREE from 'three';

export function createTraffic(scene) {
  const vehicles = [];

  const vehicleData = [
    { type: 'car', color: 0xe53935, x: -100, z: 12, speed: 5 },
    { type: 'car', color: 0xffffff, x: -65, z: 14, speed: 7 },
    { type: 'car', color: 0x1565c0, x: -30, z: 8, speed: 6 },
    { type: 'auto', color: 0xffc107, x: 5, z: -8, speed: 4 },
    { type: 'bike', color: 0x222222, x: 35, z: -21, speed: 9 },
    { type: 'bus', color: 0x2e7d32, x: 70, z: -50, speed: 4 }
  ];

  for (const data of vehicleData) {
    const group = new THREE.Group();

    const isBike = data.type === 'bike';
    const isAuto = data.type === 'auto';
    const isBus = data.type === 'bus';

    const length = isBike ? 2.1 : isAuto ? 3 : isBus ? 9 : 4.2;
    const width = isBike ? 0.8 : isAuto ? 1.5 : isBus ? 2.5 : 1.9;
    const height = isBike ? 0.8 : isBus ? 2.8 : 1.4;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, height * 0.55, length),
      new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.65
      })
    );
    body.position.y = height * 0.45;
    body.castShadow = true;
    group.add(body);

    if (!isBike) {
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.78, height * 0.55, length * 0.48),
        new THREE.MeshStandardMaterial({
          color: 0x9cc8d8,
          roughness: 0.25,
          metalness: 0.15
        })
      );
      cabin.position.set(0, height * 0.85, -length * 0.08);
      group.add(cabin);
    }

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x202020 });

    const wheelPositions = isBike
      ? [[0, 0.35, -0.7], [0, 0.35, 0.7]]
      : [
          [-width * 0.48, 0.3, -length * 0.32],
          [width * 0.48, 0.3, -length * 0.32],
          [-width * 0.48, 0.3, length * 0.32],
          [width * 0.48, 0.3, length * 0.32]
        ];

    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.18, 12),
        wheelMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
    }

    // Indian vehicle headlights and tail lights
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff2c2,
      emissiveIntensity: 1.5
    });

    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0xff2020,
      emissive: 0xff0000,
      emissiveIntensity: 1.2
    });

    for (const side of [-1, 1]) {
      const headlight = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.22, 0.12),
        headlightMat
      );
      headlight.position.set(side * width * 0.3, height * 0.42, -length * 0.49);
      group.add(headlight);

      const tailLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.22, 0.12),
        tailLightMat
      );
      tailLight.position.set(side * width * 0.3, height * 0.42, length * 0.49);
      group.add(tailLight);
    }

    // Indian-style registration plates
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    for (const side of [-1, 1]) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.48, 0.22, 0.06),
        plateMat
      );
      plate.position.set(0, height * 0.28, side * length * 0.505);
      group.add(plate);
    }

    // Vehicles face the direction in which they travel
    group.rotation.y = -Math.PI / 2;
    group.position.set(data.x, 0, data.z);
    scene.add(group);

    vehicles.push({
      group,
      speed: data.speed,
      startX: data.x,
      startZ: data.z,
      type: data.type
    });
  }

  console.log('JAMSHEDPUR TRAFFIC loaded:', vehicles.length);

  return {
    update(dt) {
      for (const vehicle of vehicles) {
        vehicle.group.position.x += vehicle.speed * dt;

        if (vehicle.group.position.x > 120) {
          vehicle.group.position.x = -120;
        }
      }
    }
  };
}

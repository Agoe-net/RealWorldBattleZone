import * as THREE from 'three';

export function createInfrastructure(scene) {
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xb8b8ae,
    roughness: 0.9
  });

  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x30383d,
    metalness: 0.5
  });

  const signalBoxMat = new THREE.MeshStandardMaterial({
    color: 0x202428
  });

  // Footpaths beside the main city road
  const road = [
    [-120, 12], [-85, 10], [-55, 18],
    [-30, 8], [0, -5], [30, -18],
    [58, -35], [82, -58], [100, -78]
  ];

  for (let i = 0; i < road.length - 1; i++) {
    const a = road[i];
    const b = road[i + 1];

    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    for (const side of [-1, 1]) {
      const offsetX = Math.cos(angle) * side * 8;
      const offsetZ = -Math.sin(angle) * side * 8;

      const footpath = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.18, length),
        concrete
      );

      footpath.position.set(
        (a[0] + b[0]) / 2 + offsetX,
        0.12,
        (a[1] + b[1]) / 2 + offsetZ
      );

      footpath.rotation.y = angle;
      footpath.receiveShadow = true;
      scene.add(footpath);
    }
  }

  // Smart traffic signals at important intersections
  function addTrafficSignal(x, z) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.16, 5, 10),
      poleMat
    );
    pole.position.set(x, 2.5, z);
    scene.add(pole);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 2.1, 0.65),
      signalBoxMat
    );
    box.position.set(x, 5.5, z);
    scene.add(box);

    const colors = [
      [0xff2020, 4.9],
      [0xffc107, 5.5],
      [0x20d45a, 6.1]
    ];

    for (const [color, y] of colors) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 12),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.8
        })
      );
      lamp.position.set(x, y, z + 0.34);
      scene.add(lamp);
    }
  }

  addTrafficSignal(8, -5);
  addTrafficSignal(66, -35);
  addTrafficSignal(-35, 8);


  // PARK BENCHES AND LED LIGHTS

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x80502f,
    roughness: 0.9
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x30363b,
    metalness: 0.65,
    roughness: 0.4
  });

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffe6a0,
    emissive: 0xffc65c,
    emissiveIntensity: 1.8
  });

  function addParkBench(x, z, rotation = 0) {
    const bench = new THREE.Group();

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.16, 0.65),
      woodMat
    );
    seat.position.y = 0.65;
    bench.add(seat);

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.8, 0.13),
      woodMat
    );
    back.position.set(0, 1.08, -0.27);
    bench.add(back);

    for (const side of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.65, 0.14),
        metalMat
      );
      leg.position.set(side, 0.32, 0);
      bench.add(leg);
    }

    bench.position.set(x, 0, z);
    bench.rotation.y = rotation;
    bench.traverse(obj => {
      if (obj.isMesh) obj.castShadow = true;
    });
    scene.add(bench);
  }

  const parkLights = [];
  const parkBulbs = [];

  function addParkLight(x, z) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 5, 8),
      poleMat
    );
    pole.position.set(x, 2.5, z);
    scene.add(pole);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.16, 0.4),
      metalMat
    );
    head.position.set(x, 5.05, z);
    scene.add(head);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 8),
      lampMat
    );
    bulb.position.set(x, 4.9, z);
    scene.add(bulb);
    parkBulbs.push(bulb);

    const light = new THREE.PointLight(0xffd58a, 1.5, 13);
    light.position.set(x, 4.7, z);
    scene.add(light);
    parkLights.push(light);
  }

  // Decorative park area near the existing city map
  addParkBench(-30, 30, 0);
  addParkBench(-42, 30, 0.2);
  addParkBench(22, -38, Math.PI / 2);
  addParkBench(35, -42, Math.PI / 2);

  addParkLight(-48, 22);
  addParkLight(-25, 22);
  addParkLight(5, -35);
  addParkLight(45, -48);


  // JUBILEE PARK WATER FOUNTAIN
  const fountain = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xb9b9b0,
    roughness: 0.8
  });

  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x299ed0,
    metalness: 0.15,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85
  });

  const basin = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.3, 0.65, 48),
    stoneMat
  );
  basin.position.y = 0.33;
  fountain.add(basin);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(4.65, 4.65, 0.08, 48),
    waterMat
  );
  water.position.y = 0.69;
  fountain.add(water);

  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.9, 2.2, 20),
    stoneMat
  );
  center.position.y = 1.75;
  fountain.add(center);

  const topBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 0.55, 0.35, 32),
    stoneMat
  );
  topBowl.position.y = 2.9;
  fountain.add(topBowl);

  const sprayMat = new THREE.MeshStandardMaterial({
    color: 0x8eeaff,
    emissive: 0x155577,
    transparent: true,
    opacity: 0.8
  });

  const fountainStreams = [];

  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;

    const stream = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.07, 1.6, 6),
      sprayMat
    );

    stream.position.set(
      Math.cos(angle) * 0.85,
      3.55,
      Math.sin(angle) * 0.85
    );

    stream.rotation.z = Math.cos(angle) * 0.45;
    stream.rotation.x = Math.sin(angle) * 0.45;
    fountain.add(stream);
    fountainStreams.push(stream);
  }

  fountain.position.set(-65, 0, 35);
  fountain.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  scene.add(fountain);

  const fountainLight = new THREE.PointLight(0x22bbff, 2.5, 22);
  fountainLight.position.set(-65, 4, 35);
  scene.add(fountainLight);

  function updateFountain(elapsed) {
    const cycle = (elapsed / 240) % 1;
    const daylight = Math.max(0, Math.sin(cycle * Math.PI * 2 - Math.PI / 2));
    const night = 1 - daylight;

    parkLights.forEach(light => {
      light.intensity = night * 1.5;
    });

    parkBulbs.forEach(bulb => {
      bulb.material.emissiveIntensity = 0.15 + night * 1.8;
    });

    fountainLight.intensity = 0.15 + night * 2.35;

    water.rotation.y = elapsed * 0.7;
    water.position.y = 0.69 + Math.sin(elapsed * 2.5) * 0.035;

    fountainStreams.forEach((stream, i) => {
      stream.rotation.z += Math.sin(elapsed * 2 + i) * 0.0008;
    });

    const hue = (elapsed * 0.12) % 1;
    fountainLight.color.setHSL(hue, 0.85, 0.6);
    lampMat.emissive.setHSL(hue, 0.85, 0.5);
  }


  console.log('SMART CITY INFRASTRUCTURE loaded');
  return { update: updateFountain };
}

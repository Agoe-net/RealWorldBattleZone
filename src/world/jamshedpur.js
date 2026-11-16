import * as THREE from 'three';

export function createJamshedpurMap(scene) {
  const obstacles = [];

  const material = (color) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.9
    });

  const groundMat = material(0x718b55);
  const roadMat = material(0x383d42);
  const lineMat = material(0xe8dfbd);
  const buildingMats = [
    material(0xc69c72),
    material(0xb7b9b5),
    material(0xd4b58a),
    material(0x9daeb5),
    material(0xc5c0a8)
  ];

  // City ground: 250 x 250 game units
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    groundMat
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Road helper
  function addRoad(x, z, width, length, rotation = 0) {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      roadMat
    );

    road.rotation.x = -Math.PI / 2;
    road.rotation.z = rotation;
    road.position.set(x, 0.035, z);
    road.receiveShadow = true;
    scene.add(road);

    // Road centre markings
    if (rotation === 0 && width >= 10) {
      for (let p = -length / 2 + 7; p < length / 2; p += 12) {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.025, 5),
          lineMat
        );

        mark.position.set(x, 0.07, z + p);
        scene.add(mark);
      }
    }
  }

  // REALISTIC JAMSHEDPUR CURVED ROAD NETWORK
  function addCurvedRoad(points, width) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];

      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      const road = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.07, length),
        roadMat
      );

      road.position.set(
        (a[0] + b[0]) / 2,
        0.045,
        (a[1] + b[1]) / 2
      );
      road.rotation.y = angle;
      scene.add(road);

      // Dashed centre markings
      for (let d = 6; d < length - 3; d += 13) {
        const mark = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.025, 4),
          lineMat
        );

        mark.position.set(
          a[0] + Math.sin(angle) * d,
          0.09,
          a[1] + Math.cos(angle) * d
        );
        mark.rotation.y = angle;
        scene.add(mark);
      }
    }
  }

  // Main city arterial road
  addCurvedRoad([
    [-120, 12], [-85, 10], [-55, 18],
    [-30, 8], [0, -5], [30, -18],
    [58, -35], [82, -58], [100, -78]
  ], 13);

  // Sakchi market connecting road
  addCurvedRoad([
    [-65, 65], [-52, 48], [-38, 30],
    [-20, 16], [0, -5]
  ], 9);

  // Jubilee Park connecting road
  addCurvedRoad([
    [0, -5], [25, -28], [45, -48],
    [67, -67], [85, -78]
  ], 9);

  // Residential area road
  addCurvedRoad([
    [-105, -85], [-80, -65], [-60, -42],
    [-35, -25], [0, -5]
  ], 8);

  // Bistupur side road
  addCurvedRoad([
    [-30, 8], [-15, 35], [5, 55],
    [30, 72], [60, 90]
  ], 8);

  // Railway station approach
  addCurvedRoad([
    [58, -35], [78, -52], [92, -72],
    [100, -90]
  ], 8);

  // Buildings
  function addBuilding(x, z, width, depth, height, index) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      buildingMats[index % buildingMats.length]
    );

    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Rooftop water tank
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 1.2, 8),
      material(0x526b79)
    );

    tank.position.set(width * 0.2, height + 0.6, 0);
    group.add(tank);

    group.position.set(x, 0, z);
    scene.add(group);

    obstacles.push({
      x,
      z,
      halfX: width / 2 + 0.65,
      halfZ: depth / 2 + 0.65
    });
  }

  // JAMSHEDPUR DISTRICT-WISE BUILDINGS
  let buildingIndex = 0;

  const districtBuildings = [
    // Sonari residential houses
    [-110, -110, 12, 11, 8],
    [-85, -110, 14, 12, 10],
    [-110, -55, 11, 12, 7],
    [-85, -48, 13, 11, 9],
    [-108, -28, 12, 10, 8],

    // North city residential blocks
    [-110, 100, 15, 13, 12],
    [-85, 105, 13, 12, 9],
    [-55, 105, 16, 14, 14],
    [-20, 108, 14, 12, 11],

    // Bistupur commercial buildings
    [88, 105, 16, 15, 20],
    [108, 82, 14, 15, 16],
    [88, 48, 17, 14, 18],

    // Tata Steel industrial buildings
    [108, 45, 18, 20, 13],
    [88, 15, 20, 16, 15],
    [108, 12, 16, 18, 11]
  ];

  for (const [x, z, width, depth, height] of districtBuildings) {
    addBuilding(x, z, width, depth, height, buildingIndex);
    buildingIndex++;
  }

  console.log("JAMSHEDPUR DISTRICT BUILDINGS loaded");

  // SAKCHI MARKET COMPLEX
  const shopColors = [
    0xe0a34a, 0xd96b4b, 0x4c9b91, 0xd8c477
  ];

  for (let i = 0; i < 4; i++) {
    const shop = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(7, 5, 6),
      material(shopColors[i])
    );
    body.position.y = 2.5;
    body.castShadow = true;
    shop.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.35, 6.5),
      material(0x454545)
    );
    roof.position.y = 5.15;
    shop.add(roof);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.35, 1.4),
      material(0xc63d32)
    );
    awning.position.set(0, 3.8, 3.3);
    shop.add(awning);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.9, 0.18),
      material(0xf5e6bd)
    );
    sign.position.set(0, 4.65, 3.08);
    shop.add(sign);

    shop.position.set(-38 + i * 9, 0, 30);
    scene.add(shop);

    obstacles.push({
      x: -38 + i * 9,
      z: 30,
      halfX: 4,
      halfZ: 3.5
    });
  }

  console.log("SAKCHI MARKET COMPLEX loaded");


  // SAKCHI STREET LIGHTS
  const poleMat = material(0x33383d);
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfff1bd,
    emissive: 0xffd477,
    emissiveIntensity: 1.2
  });

  for (let i = 0; i < 8; i++) {
    const x = -48 + i * 7;
    const z = 20;

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 7, 8),
      poleMat
    );
    pole.position.set(x, 3.5, z);
    scene.add(pole);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.12, 0.12),
      poleMat
    );
    arm.position.set(x + 0.65, 6.8, z);
    scene.add(arm);

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.18, 0.4),
      lampMat
    );
    lamp.position.set(x + 1.2, 6.7, z);
    scene.add(lamp);
  }

  console.log("SAKCHI STREET LIGHTS loaded");


  // Railway corridor on the eastern side
  const railwayBed = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 250),
    material(0x77716a)
  );

  railwayBed.rotation.x = -Math.PI / 2;
  railwayBed.position.set(120, 0.06, 0);
  scene.add(railwayBed);

  for (const x of [118, 122]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 250),
      material(0x55585a)
    );

    rail.position.set(x, 0.18, 0);
    scene.add(rail);
  }

  // Railway sleepers
  for (let z = -120; z <= 120; z += 3) {
    const sleeper = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.16, 0.35),
      material(0x594a3c)
    );

    sleeper.position.set(120, 0.16, z);
    scene.add(sleeper);
  }

  // City district labels
  function addDistrictLabel(name, x, z, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(15, 25, 35, 0.82)';
    ctx.fillRect(8, 8, 496, 80);

    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 496, 80);

    ctx.font = 'bold 38px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(name, 256, 48);

    const texture = new THREE.CanvasTexture(canvas);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 4.5),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );

    label.position.set(x, 12, z);
    label.rotation.x = -Math.PI / 2;
    scene.add(label);
  }

  addDistrictLabel('RESIDENTIAL ZONE', -65, -65, '#a9e6ff');
  addDistrictLabel('MARKET ZONE', -65, 65, '#ffe08a');
  addDistrictLabel('INDUSTRIAL ZONE', 65, 65, '#ffad91');
  addDistrictLabel('RAILWAY ZONE', 105, 0, '#ffffff');
  addDistrictLabel('GREEN ZONE', 65, -65, '#a9f0a0');

  // Jamshedpur railway station
  const stationMat = material(0xd8c6a5);
  const stationRoofMat = material(0x465b70);

  const station = new THREE.Group();

  const stationBody = new THREE.Mesh(
    new THREE.BoxGeometry(24, 9, 18),
    stationMat
  );
  stationBody.position.y = 4.5;
  station.add(stationBody);

  const stationRoof = new THREE.Mesh(
    new THREE.BoxGeometry(26, 1.2, 20),
    stationRoofMat
  );
  stationRoof.position.y = 9.6;
  station.add(stationRoof);

  station.position.set(100, 0, -90);
  scene.add(station);

  obstacles.push({
    x: 100,
    z: -90,
    halfX: 13,
    halfZ: 10
  });

  // Railway platform
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.5, 42),
    material(0xb9b2a5)
  );
  platform.position.set(113, 0.25, -90);
  scene.add(platform);

  // Platform edge marking
  const platformLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.08, 42),
    material(0xf0d65c)
  );
  platformLine.position.set(109.5, 0.55, -90);
  scene.add(platformLine);


  // STATION PLATFORM ROOF AND BENCHES
  const platformRoofMat = material(0x35495e);
  const pillarMat = material(0xe2d8c5);
  const benchMat = material(0x68452d);

  // Platform roof
  const platformRoof = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.6, 44),
    platformRoofMat
  );
  platformRoof.position.set(113, 5.8, -90);
  scene.add(platformRoof);

  // Platform support pillars
  for (let z = -109; z <= -71; z += 9) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 5.5, 0.55),
      pillarMat
    );
    pillar.position.set(110, 2.8, z);
    scene.add(pillar);

    const pillar2 = pillar.clone();
    pillar2.position.x = 116;
    scene.add(pillar2);
  }

  // Passenger benches
  for (let z = -105; z <= -75; z += 10) {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.25, 0.8),
      benchMat
    );
    bench.position.set(113, 1, z);
    scene.add(bench);
  }

  // Station entrance canopy
  const entranceRoof = new THREE.Mesh(
    new THREE.BoxGeometry(25, 0.5, 3),
    platformRoofMat
  );
  entranceRoof.position.set(100, 10.5, -79);
  scene.add(entranceRoof);

  console.log("STATION PLATFORM ROOF AND BENCHES loaded");


  // TATANAGAR JUNCTION SIGNBOARD
  const boardMat = material(0x075536);
  const boardFrameMat = material(0xe5e5d5);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 3, 14),
    boardMat
  );
  board.position.set(87.7, 8, -90);
  scene.add(board);

  const boardFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 3.3, 14.3),
    boardFrameMat
  );
  boardFrame.position.set(88, 8, -90);
  scene.add(boardFrame);

  // Green sign face
  const boardFace = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 2.8, 13.8),
    boardMat
  );
  boardFace.position.set(87.55, 8, -90);
  scene.add(boardFace);

  // Sign text
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024;
  signCanvas.height = 256;

  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#075536';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 100px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TATANAGAR JUNCTION', 512, 128);

  const signTexture = new THREE.CanvasTexture(signCanvas);
  const textBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(13.5, 2.5),
    new THREE.MeshBasicMaterial({ map: signTexture })
  );
  textBoard.rotation.y = Math.PI / 2;
  textBoard.position.set(87.42, 8, -90);
  scene.add(textBoard);

  console.log("TATANAGAR JUNCTION SIGNBOARD loaded");


  // TATANAGAR 3D TRAIN
  const trainBodyMat = material(0x245b9b);
  const trainWindowMat = material(0x9bd8e8);
  const trainRoofMat = material(0x333b45);
  const trainWheelMat = material(0x252525);
  const trainFrontMat = material(0xd9d9d9);

  // Locomotive body
  const locomotive = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 2.8, 10),
    trainBodyMat
  );
  locomotive.position.set(120, 2, -88);
  scene.add(locomotive);

  // Locomotive cabin
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.5, 3),
    trainRoofMat
  );
  cabin.position.set(120, 4.1, -91);
  scene.add(cabin);

  // Front windshield
  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.9, 2.3),
    trainWindowMat
  );
  windshield.position.set(121.72, 4.15, -84);
  scene.add(windshield);

  // Locomotive front
  const front = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.7, 0.25),
    trainFrontMat
  );
  front.position.set(120, 1.5, -82.9);
  scene.add(front);

  // Train wheels
  for (const z of [-91, -85]) {
    for (const x of [118.2, 121.8]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.65, 0.35, 16),
        trainWheelMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.8, z);
      scene.add(wheel);
    }
  }

  // Three passenger coaches
  for (let i = 0; i < 3; i++) {
    const z = -104 - i * 15;

    const coach = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 3, 13),
      trainBodyMat
    );
    coach.position.set(120, 2, z);
    scene.add(coach);

    const coachRoof = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 0.35, 13.2),
      trainRoofMat
    );
    coachRoof.position.set(120, 3.65, z);
    scene.add(coachRoof);

    for (let w = 0; w < 5; w++) {
      const window = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.85, 1.5),
        trainWindowMat
      );
      window.position.set(121.63, 2.5, z - 5 + w * 2.4);
      scene.add(window);
    }

    for (const wheelZ of [z - 4, z + 4]) {
      for (const x of [118.2, 121.8]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16),
          trainWheelMat
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.75, wheelZ);
        scene.add(wheel);
      }
    }
  }

  console.log("TATANAGAR 3D TRAIN loaded");

  // Realistic city garden
  const gardenGrass = material(0x438b45);
  const gardenPath = material(0xc7b99b);
  const garden = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 36),
    gardenGrass
  );
  garden.rotation.x = -Math.PI / 2;
  garden.position.set(67, 0.09, -67);
  scene.add(garden);

  // Garden walking paths
  function gardenPathMesh(x, z, w, d) {
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      gardenPath
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.13, z);
    scene.add(path);
  }

  gardenPathMesh(67, -67, 3, 34);
  gardenPathMesh(67, -67, 34, 3);

  // Garden fountain
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 4, 0.7, 24),
    material(0xb7bfc2)
  );
  fountainBase.position.set(67, 0.5, -67);
  scene.add(fountainBase);

  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(3.3, 3.3, 0.18, 24),
    material(0x35a9d0)
  );
  fountainWater.position.set(67, 0.92, -67);
  scene.add(fountainWater);

  // Tree materials must exist before the first addTree() call
  const trunkMat = material(0x684126);
  const leafMat = material(0x236b35);

  // Decorative garden trees
  for (const [x, z] of [
    [54, -54], [80, -54], [54, -80], [80, -80],
    [57, -67], [77, -67]
  ]) {
    addTree(x, z);
  }

  // Trees around the city

  function addTree(x, z) {
    const tree = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.3, 2.2, 7),
      trunkMat
    );

    trunk.position.y = 1.1;
    tree.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 7),
      leafMat
    );

    crown.position.y = 3;
    tree.add(crown);

    tree.position.set(x, 0, z);
    scene.add(tree);
  }

  for (let i = 0; i < 35; i++) {
    const x = (Math.random() - 0.5) * 230;
    const z = (Math.random() - 0.5) * 230;

    if (Math.abs(x) > 15 && Math.abs(z) > 15) {
      addTree(x, z);
    }
  }

  console.log('Jamshedpur city map loaded');

  return obstacles;
}

import * as THREE from 'three';

export async function createOSMMap(scene) {
  console.log('Loading Jamshedpur master map...');

  const response = await fetch(
    `${import.meta.env.BASE_URL}data/jamshedpur.osm`
  );

  if (!response.ok) {
    throw new Error('Jamshedpur OSM file not found');
  }

  const xml = new DOMParser().parseFromString(
    await response.text(),
    'application/xml'
  );

  if (xml.querySelector('parsererror')) {
    throw new Error('OSM XML parsing failed');
  }

  const nodes = new Map();

  xml.querySelectorAll('node').forEach(node => {
    nodes.set(node.getAttribute('id'), {
      lat: Number(node.getAttribute('lat')),
      lon: Number(node.getAttribute('lon'))
    });
  });

  function convert(lat, lon) {
    return {
      x: (lon - 86.205) * 4080,
      z: -(lat - 22.775) * 4452.8
    };
  }

  const roadVertices = [];
  const streetLampPositions = [];
  const roadIndices = [];

  let roads = 0;
  let buildings = 0;
  const buildingWindowMaterials = [];
  let parks = 0;
  let waterAreas = 0;
  let forests = 0;
  const greenAreas = [];

  const roadWidths = {
    motorway: 3.2,
    trunk: 3,
    primary: 2.7,
    secondary: 2.2,
    tertiary: 1.7,
    residential: 1.25,
    unclassified: 1.1,
    service: 0.8,
    living_street: 0.9,
    track: 0.8,
    footway: 0.45,
    path: 0.4,
    pedestrian: 1.2
  };

  const buildingColors = [
    0xc9b69a,
    0xb9c0c4,
    0xd2b58b,
    0xb9a18c,
    0xd4d0c5,
    0xc4a88c,
    0xaaa69e
  ];

  const materials = {
    park: new THREE.MeshStandardMaterial({
      color: 0x548c48,
      roughness: 1,
      side: THREE.DoubleSide
    }),
    forest: new THREE.MeshStandardMaterial({
      color: 0x285c35,
      roughness: 1,
      side: THREE.DoubleSide
    }),
    water: new THREE.MeshStandardMaterial({
      color: 0x368bb5,
      roughness: 0.3,
      side: THREE.DoubleSide
    }),
    grass: new THREE.MeshStandardMaterial({
      color: 0x82a95b,
      roughness: 1,
      side: THREE.DoubleSide
    })
  };

  function makePolygon(points, material, y = 0.08) {
    if (points.length < 4) return;

    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, -points[0].z);

    for (let i = 1; i < points.length - 1; i++) {
      shape.lineTo(points[i].x, -points[i].z);
    }

    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  function makeBuilding(points, tags, id) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, -points[0].z);

    for (let i = 1; i < points.length - 1; i++) {
      shape.lineTo(points[i].x, -points[i].z);
    }

    shape.closePath();

    const levels = Number(tags['building:levels']) || 0;
    const realHeight = parseFloat(tags.height) || 0;

    const height = THREE.MathUtils.clamp(
      realHeight ? realHeight * 0.2 :
      levels ? levels * 0.55 : 1.8,
      1.2,
      12
    );

    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
      curveSegments: 1
    });

    geometry.rotateX(-Math.PI / 2);

    let color = buildingColors[
      Math.abs(Number(id) || buildings) % buildingColors.length
    ];

    if (tags.building === 'industrial' ||
        tags.building === 'warehouse') color = 0x888b8d;

    if (tags.building === 'house' ||
        tags.building === 'residential') color = 0xd1b28d;

    if (tags.building === 'apartments') color = 0xb7bdc3;
    if (tags.building === 'temple') color = 0xd5a34c;

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.88
      })
    );

    mesh.position.y = 0.16;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Night windows on all four building sides
    const windowGeo = new THREE.PlaneGeometry(0.32, 0.28);
    const windowGroup = new THREE.Group();

    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minZ = Math.min(...points.map(p => p.z));
    const maxZ = Math.max(...points.map(p => p.z));

    const countX = Math.min(5, Math.max(1, Math.floor((maxX - minX) / 2.5)));
    const countZ = Math.min(5, Math.max(1, Math.floor((maxZ - minZ) / 2.5)));
    const floors = Math.min(5, Math.max(1, Math.floor(height / 2)));

    function addWindow(x, y, z, rotationY = 0) {
      const material = new THREE.MeshBasicMaterial({
        color: 0xffd98a,
        transparent: true,
        opacity: 0
      });

      const windowMesh = new THREE.Mesh(windowGeo, material);
      windowMesh.position.set(x, y, z);
      windowMesh.rotation.y = rotationY;
      buildingWindowMaterials.push(material);
      windowGroup.add(windowMesh);
    }

    for (let floor = 0; floor < floors; floor++) {
      const y = 0.16 + (floor + 0.65) * height / floors;

      for (let i = 0; i < countX; i++) {
        const x = minX + (i + 0.5) * (maxX - minX) / countX;
        addWindow(x, y, minZ - 0.015);
        addWindow(x, y, maxZ + 0.015, Math.PI);
      }

      for (let i = 0; i < countZ; i++) {
        const z = minZ + (i + 0.5) * (maxZ - minZ) / countZ;
        addWindow(minX - 0.015, y, z, -Math.PI / 2);
        addWindow(maxX + 0.015, y, z, Math.PI / 2);
      }
    }

    scene.add(windowGroup);

    buildings++;
  }

  for (const way of xml.querySelectorAll('way')) {
    const tags = {};

    way.querySelectorAll('tag').forEach(tag => {
      tags[tag.getAttribute('k')] = tag.getAttribute('v');
    });

    const points = [...way.querySelectorAll('nd')]
      .map(nd => nodes.get(nd.getAttribute('ref')))
      .filter(Boolean)
      .map(p => convert(p.lat, p.lon));

    if (points.length < 2) continue;

    const closed =
      points.length >= 4 &&
      points[0].x === points[points.length - 1].x &&
      points[0].z === points[points.length - 1].z;

    // Rivers, canals and streams
    if (
      tags.waterway === 'river' ||
      tags.waterway === 'canal' ||
      tags.waterway === 'stream' ||
      tags.waterway === 'drain'
    ) {
      const width =
        tags.waterway === 'river' ? 2.8 :
        tags.waterway === 'canal' ? 1.8 :
        tags.waterway === 'stream' ? 0.8 : 0.35;

      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);
        if (length < 0.05) continue;

        const px = -dz / length * width / 2;
        const pz = dx / length * width / 2;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([
          a.x + px, 0.15, a.z + pz,
          a.x - px, 0.15, a.z - pz,
          b.x - px, 0.15, b.z - pz,
          b.x + px, 0.15, b.z + pz
        ], 3));
        geometry.setIndex([0, 1, 2, 0, 2, 3]);
        geometry.computeVertexNormals();

        const waterLine = new THREE.Mesh(geometry, materials.water);
        waterLine.material.side = THREE.DoubleSide;
        scene.add(waterLine);
      }
      continue;
    }

    // Roads and narrow streets
    if (tags.highway) {
      const width = roadWidths[tags.highway] || 0.65;

      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];

        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const length = Math.hypot(dx, dz);

        if (length < 0.05) continue;

        // Record occasional roadside lamp positions
        if (
          ['primary', 'secondary', 'tertiary', 'trunk', 'residential'].includes(tags.highway) &&
          streetLampPositions.length < 250 &&
          i % 5 === 0
        ) {
          const side = streetLampPositions.length % 2 === 0 ? 1 : -1;
          streetLampPositions.push({
            x: (a.x + b.x) / 2 + (-dz / length) * 5 * side,
            z: (a.z + b.z) / 2 + (dx / length) * 5 * side
          });
        }

        const px = -dz / length * width / 2;
        const pz = dx / length * width / 2;
        const base = roadVertices.length / 3;

        roadVertices.push(
          a.x + px, 0.13, a.z + pz,
          a.x - px, 0.13, a.z - pz,
          b.x - px, 0.13, b.z - pz,
          b.x + px, 0.13, b.z + pz
        );

        roadIndices.push(
          base, base + 1, base + 2,
          base, base + 2, base + 3
        );
      }

      roads++;
    }

    if (!closed) continue;

    // Real building footprints
    if (tags.building && tags.building !== 'no') {
      if (points.length <= 100) {
        makeBuilding(points, tags, way.getAttribute('id'));
      }
      continue;
    }

    // Parks and gardens
    if (
      tags.leisure === 'park' ||
      tags.leisure === 'garden' ||
      tags.landuse === 'recreation_ground'
    ) {
      makePolygon(points, materials.park, 0.09);
      greenAreas.push({ points, density: 160 });
      parks++;
      continue;
    }

    // Forest and woodland
    if (
      tags.natural === 'wood' ||
      tags.landuse === 'forest'
    ) {
      makePolygon(points, materials.forest, 0.10);
      greenAreas.push({ points, density: 75 });
      forests++;
      continue;
    }

    // Lakes, ponds and water areas
    if (
      tags.natural === 'water' ||
      tags.landuse === 'basin' ||
      tags.water
    ) {
      makePolygon(points, materials.water, 0.12);
      waterAreas++;
      continue;
    }

    // Grass and open fields
    if (
      tags.landuse === 'grass' ||
      tags.landuse === 'meadow' ||
      tags.natural === 'grassland'
    ) {
      makePolygon(points, materials.grass, 0.085);
    }
  }

  if (roadVertices.length) {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(roadVertices, 3)
    );

    geometry.setIndex(roadIndices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x45484b,
        roughness: 0.95,
        side: THREE.DoubleSide
      })
    );

    mesh.receiveShadow = true;
    scene.add(mesh);
  }



  // Efficient roadside LED street lamps
  const lampPoleMat = new THREE.MeshStandardMaterial({
    color: 0x303943,
    metalness: 0.65,
    roughness: 0.4
  });

  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe7ae,
    emissive: 0xffc56b,
    emissiveIntensity: 0.1
  });

  const poleGeometry = new THREE.CylinderGeometry(0.09, 0.13, 5.5, 6);
  const bulbGeometry = new THREE.SphereGeometry(0.2, 8, 6);
  const armGeometry = new THREE.BoxGeometry(1.5, 0.09, 0.09);

  const lightPoolMat = new THREE.MeshBasicMaterial({
    color: 0xffd58a,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });

  const lightPoolGeometry = new THREE.CircleGeometry(2.8, 12);
  const lightPools = [];

  for (const pos of streetLampPositions) {
    const pole = new THREE.Mesh(poleGeometry, lampPoleMat);
    pole.position.set(pos.x, 2.75, pos.z);
    scene.add(pole);

    const arm = new THREE.Mesh(armGeometry, lampPoleMat);
    arm.position.set(pos.x + 0.65, 5.35, pos.z);
    scene.add(arm);

    const bulb = new THREE.Mesh(bulbGeometry, lampBulbMat);
    bulb.position.set(pos.x + 1.25, 5.25, pos.z);
    scene.add(bulb);

    const pool = new THREE.Mesh(lightPoolGeometry, lightPoolMat.clone());
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(pos.x + 1.25, 0.035, pos.z);
    scene.add(pool);
    lightPools.push(pool);
  }

  function updateStreetLights(night) {
    lampBulbMat.emissiveIntensity = 0.08 + night * 2.2;

    for (const pool of lightPools) {
      pool.material.opacity = night * 0.22;
    }

    for (const material of buildingWindowMaterials) {
      material.opacity = night * 0.9;
    }
  }

  // Instanced trees inside real OSM parks and forests
  function insidePolygon(x, z, points) {
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i];
      const b = points[j];

      if (
        ((a.z > z) !== (b.z > z)) &&
        (x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x)
      ) {
        inside = !inside;
      }
    }

    return inside;
  }

  const treePositions = [];
  let seed = 12345;

  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  for (const area of greenAreas) {
    const points = area.points;
    const xs = points.map(p => p.x);
    const zs = points.map(p => p.z);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    const areaSize = (maxX - minX) * (maxZ - minZ);
    const count = Math.min(
      35,
      Math.max(2, Math.floor(areaSize / area.density))
    );

    for (let i = 0; i < count * 5 && treePositions.length < 450; i++) {
      const x = minX + random() * (maxX - minX);
      const z = minZ + random() * (maxZ - minZ);

      if (insidePolygon(x, z, points)) {
        treePositions.push({
          x,
          z,
          scale: 0.75 + random() * 0.65
        });

        if (treePositions.length >= 450) break;
      }
    }

    if (treePositions.length >= 450) break;
  }

  if (treePositions.length) {
    const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.20, 2.8, 6);
    const crownGeometry = new THREE.IcosahedronGeometry(1.15, 1);

    const trunkMesh = new THREE.InstancedMesh(
      trunkGeometry,
      new THREE.MeshStandardMaterial({ color: 0x654126 }),
      treePositions.length
    );

    const crownMesh = new THREE.InstancedMesh(
      crownGeometry,
      new THREE.MeshStandardMaterial({ color: 0x28723a }),
      treePositions.length
    );

    const dummy = new THREE.Object3D();

    treePositions.forEach((tree, i) => {
      dummy.position.set(tree.x, 1.4 * tree.scale, tree.z);
      dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tree.x, 3.0 * tree.scale, tree.z);
      dummy.scale.setScalar(tree.scale);
      dummy.updateMatrix();
      crownMesh.setMatrixAt(i, dummy.matrix);
    });

    trunkMesh.castShadow = true;
    crownMesh.castShadow = true;
    scene.add(trunkMesh, crownMesh);
  }

  console.log('JAMSHEDPUR STREET LIGHTS:', streetLampPositions.length);
  console.log('PARK AND FOREST TREES:', treePositions.length);

  console.log('JAMSHEDPUR 3D WORLD READY', {
    roads,
    buildings,
    parks,
    forests,
    waterAreas,
    nodes: nodes.size
  });

  const attribution = document.createElement('div');
  attribution.textContent = '© OpenStreetMap contributors';
  attribution.style.cssText =
    'position:fixed;bottom:5px;right:8px;z-index:1000;' +
    'font-size:10px;color:white;text-shadow:1px 1px 2px black;';
  document.body.appendChild(attribution);
  return { updateStreetLights };
}

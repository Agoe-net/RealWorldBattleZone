
import { io } from 'socket.io-client';
import * as THREE from 'three';

export function createMultiplayer({ scene, player, statusText }) {
  const socket = io(import.meta.env.VITE_MULTIPLAYER_URL || 'http://localhost:3001');

  const remotePlayers = new Map();

  let sendTimer = 0;
  let selectedWeapon = 'pistol';
  let matchSeconds = 0;
  let joined = false;

  const weapons = {
    pistol: { name: 'Pistol', ammo: 15, maxAmmo: 15 },
    rifle: { name: 'Assault Rifle', ammo: 30, maxAmmo: 30 },
    shotgun: { name: 'Shotgun', ammo: 8, maxAmmo: 8 },
    sniper: { name: 'Sniper Rifle', ammo: 5, maxAmmo: 5 }
  };

  const aliveElement = document.getElementById('aliveCount');
  const timerElement = document.getElementById('matchTimer');
  const ammoElement = document.getElementById('ammoCount');
  const healthElement = document.getElementById('healthText');
  const healthBar = document.getElementById('healthBar');

  const weaponButtons = document.querySelectorAll('.weapon-slot');
  const fireButton = document.getElementById('fireBtn');
  const crouchButton = document.getElementById('crouchBtn');
  const reloadButton = document.getElementById('reloadBtn');
  const medkitButton = document.getElementById('medkitBtn');
  const grenadeButton = document.getElementById('grenadeBtn');
  let medkitsRemaining = 3;
  let grenadesRemaining = 3;
  const grenadeVisuals = [];
  const explosionVisuals = [];
  let reloading = false;

  function updateAmmo() {
    if (ammoElement) {
      ammoElement.textContent = weapons[selectedWeapon].ammo;
    }
  }

  function updateMedkitButton() {
    if (medkitButton) {
      medkitButton.textContent = `✚ MEDKIT ${medkitsRemaining}`;
    }
  }


  function updateGrenadeButton() {
    if (grenadeButton) {
      grenadeButton.textContent = `💣 GRENADE ${grenadesRemaining}`;
    }
  }

  function throwGrenade() {
    if (!socket.connected || !joined) {
      statusText.textContent = 'Not connected to server';
      return;
    }

    if (grenadesRemaining <= 0) {
      statusText.textContent = 'No grenades left';
      return;
    }

    const angle = player.rotation.y;

    socket.emit('throwGrenade', {
      direction: {
        x: Math.sin(angle),
        z: Math.cos(angle)
      }
    });
  }

  function addGrenadeProjectile(data) {
    if (!data?.start || !data?.target) return;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({
        color: 0x252525,
        roughness: 0.8
      })
    );

    const start = new THREE.Vector3(
      data.start.x, data.start.y, data.start.z
    );
    const target = new THREE.Vector3(
      data.target.x, data.target.y, data.target.z
    );

    mesh.position.copy(start);
    scene.add(mesh);

    grenadeVisuals.push({
      mesh,
      start,
      target,
      elapsed: 0,
      duration: (data.duration || 1200) / 1000
    });
  }

  function addExplosion(data) {
    if (!data?.position) return;

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xff7a18,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      })
    );

    mesh.position.set(
      data.position.x,
      data.position.y + 0.8,
      data.position.z
    );

    scene.add(mesh);
    explosionVisuals.push({ mesh, elapsed: 0 });
  }

  function updateGrenadeEffects(dt) {
    for (let i = grenadeVisuals.length - 1; i >= 0; i--) {
      const item = grenadeVisuals[i];
      item.elapsed += dt;

      const progress = Math.min(1, item.elapsed / item.duration);
      item.mesh.position.lerpVectors(
        item.start, item.target, progress
      );
      item.mesh.position.y += Math.sin(progress * Math.PI) * 2.2;

      if (progress >= 1) {
        scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        grenadeVisuals.splice(i, 1);
      }
    }

    for (let i = explosionVisuals.length - 1; i >= 0; i--) {
      const item = explosionVisuals[i];
      item.elapsed += dt;

      const progress = Math.min(1, item.elapsed / 0.55);
      const scale = 0.5 + progress * 5;

      item.mesh.scale.setScalar(scale);
      item.mesh.material.opacity = 0.65 * (1 - progress);

      if (progress >= 1) {
        scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        explosionVisuals.splice(i, 1);
      }
    }
  }

  function reloadWeapon() {
    if (reloading) return;
    const gun = weapons[selectedWeapon];

    if (gun.ammo >= gun.maxAmmo) {
      statusText.textContent = 'Magazine already full';
      return;
    }

    reloading = true;
    if (reloadButton) reloadButton.classList.add('active');
    statusText.textContent = `Reloading ${gun.name}...`;

    window.setTimeout(() => {
      gun.ammo = gun.maxAmmo;
      reloading = false;
      if (reloadButton) reloadButton.classList.remove('active');
      updateAmmo();
      statusText.textContent = `${gun.name} reloaded`;
    }, 1200);
  }

  function updateHealth(hp) {
    const health = Math.max(0, Math.min(100, hp));

    if (healthElement) {
      healthElement.textContent = `${health} / 100`;
    }

    if (healthBar) {
      healthBar.style.width = `${health}%`;
    }
  }

  function updateAliveCount() {
    if (aliveElement) {
      aliveElement.textContent = String(remotePlayers.size + 1);
    }
  }

  function updateTimer() {
    if (!timerElement) return;

    const minutes = Math.floor(matchSeconds / 60);
    const seconds = matchSeconds % 60;

    timerElement.textContent =
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function createCharacter() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.85, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xe53935 })
    );

    body.position.y = 1.45;
    group.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xb97850 })
    );

    head.position.y = 2.2;
    group.add(head);

    scene.add(group);

    return group;
  }

  function addPlayer(data) {
    if (!data || !data.id) return;
    if (data.id === socket.id) return;
    if (remotePlayers.has(data.id)) return;

    const character = createCharacter();

    character.position.set(
      Number(data.x) || 0,
      Number(data.y) || 0,
      Number(data.z) || 0
    );

    remotePlayers.set(data.id, character);

    updateAliveCount();
  }

  function removePlayer(id) {
    const character = remotePlayers.get(id);

    if (!character) return;

    scene.remove(character);

    character.traverse(object => {
      if (object.geometry) object.geometry.dispose();

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    remotePlayers.delete(id);

    updateAliveCount();
  }

  function selectWeapon(weaponId) {
    if (!weapons[weaponId]) return;

    selectedWeapon = weaponId;

    weaponButtons.forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.weapon === weaponId
      );
    });

    updateAmmo();

    statusText.textContent =
      `Weapon: ${weapons[selectedWeapon].name}`;
  }

  function shoot() {
    if (!socket.connected || !joined) {
      statusText.textContent = 'Not connected to server!';
      return;
    }

    if (reloading) {
      statusText.textContent = 'Please wait for reload';
      return;
    }

    if (weapons[selectedWeapon].ammo <= 0) {
      statusText.textContent = 'No ammo! Tap RELOAD.';
      return;
    }

    let nearestId = null;
    let nearestDistance = Infinity;

    for (const [id, character] of remotePlayers) {
      const distance = player.position.distanceTo(
        character.position
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = id;
      }
    }

    if (!nearestId) {
      statusText.textContent = 'No enemy nearby!';
      return;
    }

    socket.emit('shoot', {
      targetId: nearestId,
      weapon: selectedWeapon
    });
  }

  // Server connection

  const gameRoot = document.getElementById('game') || document.body;

  const killCounter = document.createElement('div');
  killCounter.id = 'killCounter';
  killCounter.textContent = '☠ KILLS: 0';
  Object.assign(killCounter.style, {
    position:'fixed', top:'75px', right:'12px', zIndex:'5000',
    padding:'10px 14px', color:'#fff', background:'#111c',
    border:'1px solid #ffb000', borderRadius:'10px',
    fontWeight:'bold'
  });
  gameRoot.appendChild(killCounter);

  const deathOverlay = document.createElement('div');
  Object.assign(deathOverlay.style, {
    display:'none', position:'fixed', inset:'0', zIndex:'10000',
    background:'#000d', color:'#fff', alignItems:'center',
    justifyContent:'center', flexDirection:'column', gap:'18px'
  });

  const deathTitle = document.createElement('h1');
  deathTitle.textContent = 'YOU ARE ELIMINATED';

  const respawnButton = document.createElement('button');
  respawnButton.textContent = '⟳ RESPAWN';
  Object.assign(respawnButton.style, {
    padding:'15px 35px', fontSize:'20px', fontWeight:'bold',
    color:'#111', background:'#ffb000', border:'0', borderRadius:'10px'
  });

  deathOverlay.append(deathTitle, respawnButton);
  gameRoot.appendChild(deathOverlay);

  respawnButton.addEventListener('click', () => {
    if (!socket.connected) return;
    respawnButton.disabled = true;
    respawnButton.textContent = 'RESPAWNING...';
    socket.emit('respawn');
  });

  socket.on('connect', () => {
    statusText.textContent = 'Online - Joining room...';

    socket.emit('joinRoom', {
      roomId: 'rwbz-test-room',
      mode: 'battle-royale',
      name: 'Soldier'
    });
  });

  socket.on('joined', data => {
    const own = data?.players?.find(p => p.id === socket.id);
    killCounter.textContent = `☠ KILLS: ${Number(own?.kills || 0)}`;

    if (!data || !Array.isArray(data.players)) return;

    joined = true;
    const ownPlayer = data.players.find(p => p.id === socket.id);
    medkitsRemaining = Number(ownPlayer?.medkits ?? 3);
    grenadesRemaining = Number(ownPlayer?.grenades ?? 3);
    updateMedkitButton();
    updateGrenadeButton();

    data.players.forEach(addPlayer);

    updateAliveCount();

    statusText.textContent =
      `Online - Players: ${data.players.length}`;
  });

  socket.on('playerJoined', data => {
    addPlayer(data);
    statusText.textContent = 'Enemy joined the match!';
  });

  socket.on('playerMoved', data => {
    const character = remotePlayers.get(data.id);

    if (!character) return;

    character.position.set(
      Number(data.x) || 0,
      Number(data.y) || 0,
      Number(data.z) || 0
    );
  });

  socket.on('playerLeft', id => {
    removePlayer(id);
    statusText.textContent = 'Player left the match';
  });

  socket.on('playerDamaged', data => {
    if (!data) return;

    if (data.id === socket.id) {
      updateHealth(data.hp);
      statusText.textContent = `You were hit! HP: ${data.hp}`;
    } else {
      statusText.textContent = `Enemy hit! HP: ${data.hp}`;
    }
  });

  socket.on('playerHealed', data => {
    if (!data || data.id !== socket.id) return;

    updateHealth(data.hp);
    medkitsRemaining = Number(data.medkits ?? medkitsRemaining);
    updateMedkitButton();
    statusText.textContent = `Medkit used! HP: ${data.hp}`;
  });

  socket.on('medkitResult', data => {
    if (!data) return;

    if (Number.isFinite(data.medkits)) {
      medkitsRemaining = data.medkits;
      updateMedkitButton();
    }

    if (!data.success && data.reason) {
      statusText.textContent = data.reason;
    }
  });


  socket.on('grenadeResult', data => {
    if (!data) return;

    if (Number.isFinite(data.grenades)) {
      grenadesRemaining = data.grenades;
      updateGrenadeButton();
    }

    if (data.success) {
      statusText.textContent = 'Grenade thrown!';
    } else if (data.reason) {
      statusText.textContent = data.reason;
    }
  });

  socket.on('grenadeThrown', addGrenadeProjectile);
  socket.on('grenadeExploded', data => {
    addExplosion(data);
    statusText.textContent = 'GRENADE EXPLOSION!';
  });


  socket.on('killCount', data => {
    if (data?.id === socket.id) {
      killCounter.textContent = `☠ KILLS: ${Number(data.kills || 0)}`;
    }
  });

  socket.on('playerRespawned', data => {
    if (!data) return;
    if (data.id === socket.id) {
      player.position.set(Number(data.x)||0, Number(data.y)||0, Number(data.z)||0);
      updateHealth(data.hp);
      deathOverlay.style.display = 'none';
      respawnButton.disabled = false;
      respawnButton.textContent = '⟳ RESPAWN';
      statusText.textContent = 'Back in battle!';
    } else {
      addPlayer(data);
      updateAliveCount();
    }
  });

  socket.on('playerDied', data => {
    if (!data) return;

    if (data.id === socket.id) {
      updateHealth(0);
      statusText.textContent = 'YOU ARE ELIMINATED!';
      deathOverlay.style.display = 'flex';
      respawnButton.disabled = false;
      respawnButton.textContent = '⟳ RESPAWN';
    } else {
      removePlayer(data.id);
      statusText.textContent = 'Enemy eliminated!';
    }
  });

  socket.on('shotResult', data => {
    if (!data) return;

    if (data.hit) {
      weapons[selectedWeapon].ammo = Math.max(
        0,
        weapons[selectedWeapon].ammo - 1
      );

      updateAmmo();

      statusText.textContent =
        `HIT! Damage: ${data.damage}`;
    } else {
      statusText.textContent = data.reason || 'Missed!';
    }
  });

  socket.on('joinError', message => {
    joined = false;
    statusText.textContent = `Join error: ${message}`;
  });

  socket.on('disconnect', () => {
    joined = false;
    statusText.textContent = 'Disconnected from server';
  });

  socket.on('connect_error', () => {
    statusText.textContent = 'Multiplayer connection failed';
  });

  // Weapon selection buttons
  weaponButtons.forEach(button => {
    button.addEventListener('click', () => {
      selectWeapon(button.dataset.weapon);
    });
  });

  // Fire button
  if (fireButton) {
    fireButton.addEventListener('pointerdown', event => {
      event.preventDefault();
      shoot();
    });
  }

  if (grenadeButton) {
    grenadeButton.addEventListener('click', throwGrenade);
  }

  if (reloadButton) {
    reloadButton.addEventListener('click', reloadWeapon);
  }

  if (medkitButton) {
    medkitButton.addEventListener('click', () => {
      if (!socket.connected || !joined) {
        statusText.textContent = 'Not connected to server';
        return;
      }
      socket.emit('useMedkit');
    });
  }

  // Crouch button: visual prototype only
  let crouching = false;

  if (crouchButton) {
    crouchButton.addEventListener('click', () => {
      crouching = !crouching;

      crouchButton.textContent =
        crouching ? 'STAND' : 'CROUCH';

      statusText.textContent =
        crouching ? 'Crouch selected' : 'Standing';
    });
  }

  selectWeapon('pistol');
  updateMedkitButton();
  updateGrenadeButton();

  return {
    update(dt) {
      updateGrenadeEffects(dt);

      if (joined && socket.connected) {
        sendTimer += dt;

        if (sendTimer >= 0.1) {
          sendTimer = 0;

          socket.emit('move', {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z
          });
        }

        matchSeconds += dt;

        if (matchSeconds >= 1) {
          matchSeconds = 0;
          updateTimer();
        }
      }
    }
  };
}

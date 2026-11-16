
import { io } from 'socket.io-client';
import * as THREE from 'three';

export function createMultiplayer({ scene, player, statusText }) {
  const socket = io('http://localhost:3001');

  const remotePlayers = new Map();

  let sendTimer = 0;
  let selectedWeapon = 'pistol';
  let matchSeconds = 0;
  let joined = false;

  const weapons = {
    pistol: {
      name: 'Pistol',
      ammo: 15
    },
    rifle: {
      name: 'Assault Rifle',
      ammo: 30
    },
    shotgun: {
      name: 'Shotgun',
      ammo: 8
    },
    sniper: {
      name: 'Sniper Rifle',
      ammo: 5
    }
  };

  const aliveElement = document.getElementById('aliveCount');
  const timerElement = document.getElementById('matchTimer');
  const ammoElement = document.getElementById('ammoCount');
  const healthElement = document.getElementById('healthText');
  const healthBar = document.getElementById('healthBar');

  const weaponButtons = document.querySelectorAll('.weapon-slot');
  const fireButton = document.getElementById('fireBtn');
  const crouchButton = document.getElementById('crouchBtn');

  function updateAmmo() {
    if (ammoElement) {
      ammoElement.textContent = weapons[selectedWeapon].ammo;
    }
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

    if (weapons[selectedWeapon].ammo <= 0) {
      statusText.textContent = 'No ammo! Reload system coming soon.';
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
  socket.on('connect', () => {
    statusText.textContent = 'Online - Joining room...';

    socket.emit('joinRoom', {
      roomId: 'rwbz-test-room',
      mode: 'battle-royale',
      name: 'Soldier'
    });
  });

  socket.on('joined', data => {
    if (!data || !Array.isArray(data.players)) return;

    joined = true;

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

  socket.on('playerDied', data => {
    if (!data) return;

    if (data.id === socket.id) {
      updateHealth(0);
      statusText.textContent = 'YOU ARE ELIMINATED!';
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

  return {
    update(dt) {
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

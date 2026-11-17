import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const rooms = new Map();
const MAX_PLAYERS = 50;

const WEAPONS = {
  pistol:  { damage: 25, cooldown: 400, range: 45 },
  rifle:   { damage: 20, cooldown: 120, range: 90 },
  shotgun: { damage: 50, cooldown: 800, range: 18 },
  sniper:  { damage: 90, cooldown: 1200, range: 150 }
};


app.get('/', (req, res) => {
  res.json({
    game: 'Bharat Battle Royale',
    status: 'online',
    maxPlayers: MAX_PLAYERS
  });
});

io.on('connection', socket => {
  console.log('Connected:', socket.id);

  socket.on('joinRoom', ({ roomId, mode, name }) => {
    if (!roomId || !['battle-royale', 'team-deathmatch'].includes(mode)) {
      socket.emit('joinError', 'Invalid room or mode');
      return;
    }

    let room = rooms.get(roomId);

    if (!room) {
      room = { mode, players: new Map() };
      rooms.set(roomId, room);
    }

    if (room.mode !== mode || room.players.size >= MAX_PLAYERS) {
      socket.emit('joinError', 'Room full or mode mismatch');
      return;
    }

    const player = {
      id: socket.id,
      name: String(name || 'Soldier').slice(0, 20),
      x: 0,
      y: 0,
      z: 0,
      hp: 100,
      kills: 0,
        medkits: 3,
      grenades: 3,
      team: mode === 'team-deathmatch'
        ? (room.players.size % 2 === 0 ? 'red' : 'blue')
        : null
    };

    socket.join(roomId);
    socket.data.roomId = roomId;
    room.players.set(socket.id, player);

    socket.emit('joined', {
      player,
      players: [...room.players.values()],
      mode
    });

    socket.to(roomId).emit('playerJoined', player);
    console.log(`${player.name} joined ${roomId}`);
  });

  socket.on('move', position => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    const player = room?.players.get(socket.id);

    if (!player || !position) return;

    for (const key of ['x', 'y', 'z']) {
      const value = Number(position[key]);
      if (!Number.isFinite(value) || Math.abs(value) > 150) return;
      player[key] = value;
    }

    socket.to(roomId).emit('playerMoved', player);
  });


  socket.on('useMedkit', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    const player = room?.players.get(socket.id);

    if (!player || player.hp <= 0) return;

    if (player.medkits <= 0) {
      socket.emit('medkitResult', {
        success: false, reason: 'No medkits left', medkits: 0
      });
      return;
    }

    if (player.hp >= 100) {
      socket.emit('medkitResult', {
        success: false, reason: 'Health is already full',
        medkits: player.medkits
      });
      return;
    }

    const now = Date.now();
    if (now - (socket.data.lastMedkitAt || 0) < 3000) return;
    socket.data.lastMedkitAt = now;

    player.medkits -= 1;
    player.hp = Math.min(100, player.hp + 40);

    io.to(roomId).emit('playerHealed', {
      id: player.id,
      hp: player.hp,
      medkits: player.medkits
    });
  });


  // Server-authoritative grenade system
  socket.on('throwGrenade', ({ direction } = {}) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    const player = room?.players.get(socket.id);

    if (!player || player.hp <= 0) return;

    if (player.grenades <= 0) {
      socket.emit('grenadeResult', {
        success: false,
        reason: 'No grenades left',
        grenades: 0
      });
      return;
    }

    const dx = Number(direction?.x);
    const dz = Number(direction?.z);
    const length = Math.hypot(dx, dz);

    if (!Number.isFinite(length) || length < 0.5 || length > 2) {
      socket.emit('grenadeResult', {
        success: false,
        reason: 'Invalid throw direction',
        grenades: player.grenades
      });
      return;
    }

    const now = Date.now();
    if (now - (socket.data.lastGrenadeAt || 0) < 700) return;
    socket.data.lastGrenadeAt = now;

    player.grenades -= 1;

    const start = {
      x: player.x,
      y: player.y + 1,
      z: player.z
    };

    const target = {
      x: player.x + (dx / length) * 12,
      y: player.y,
      z: player.z + (dz / length) * 12
    };

    io.to(roomId).emit('grenadeThrown', {
      id: socket.id,
      start,
      target,
      duration: 1200
    });

    socket.emit('grenadeResult', {
      success: true,
      grenades: player.grenades
    });

    setTimeout(() => {
      if (rooms.get(roomId) !== room) return;

      const radius = 8;

      io.to(roomId).emit('grenadeExploded', {
        id: socket.id,
        position: target,
        radius
      });

      for (const victim of room.players.values()) {
        if (victim.hp <= 0) continue;

        if (
          room.mode === 'team-deathmatch' &&
          victim.team === player.team
        ) continue;

        const distance = Math.hypot(
          victim.x - target.x,
          victim.y - target.y,
          victim.z - target.z
        );

        if (distance > radius) continue;

        const damage = Math.max(
          20,
          Math.round(100 * (1 - distance / radius))
        );

        victim.hp = Math.max(0, victim.hp - damage);

        io.to(roomId).emit('playerDamaged', {
          id: victim.id,
          hp: victim.hp,
          attackerId: player.id,
          damage,
          weapon: 'grenade'
        });

        if (victim.hp === 0) {
          player.kills = (player.kills || 0) + 1;
          io.to(roomId).emit('killCount', { id: player.id, kills: player.kills });
          io.to(roomId).emit('playerDied', {
            id: victim.id,
            attackerId: player.id
          });
        }
      }
    }, 1200);
  });

  socket.on('shoot', ({ targetId, weapon = 'pistol' } = {}) => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    const shooter = room?.players.get(socket.id);
    const target = room?.players.get(targetId);
    const gun = WEAPONS[weapon];

    if (!shooter || !target || !gun || targetId === socket.id) return;

    if (
      room.mode === 'team-deathmatch' &&
      shooter.team === target.team
    ) {
      socket.emit('shotResult', { hit: false, reason: 'friendly-fire' });
      return;
    }

    const now = Date.now();
    if (now - (socket.data.lastShotAt || 0) < gun.cooldown) return;
    socket.data.lastShotAt = now;

    if (target.hp <= 0) return;

    const dx = shooter.x - target.x;
    const dy = shooter.y - target.y;
    const dz = shooter.z - target.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > gun.range) {
      socket.emit('shotResult', { hit: false, reason: 'out-of-range' });
      return;
    }

    target.hp = Math.max(0, target.hp - gun.damage);

    io.to(roomId).emit('playerDamaged', {
      id: target.id,
      hp: target.hp,
      attackerId: shooter.id
    });

    socket.emit('shotResult', {
      hit: true,
      targetId: target.id,
      damage: gun.damage
    });

    if (target.hp === 0) {
      shooter.kills = (shooter.kills || 0) + 1;
      io.to(roomId).emit('killCount', { id: shooter.id, kills: shooter.kills });
      io.to(roomId).emit('playerDied', {
        id: target.id,
        attackerId: shooter.id
      });
    }
  });

  socket.on('respawn', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);
    const player = room?.players.get(socket.id);

    if (!player || player.hp > 0) return;

    player.hp = 100;
    player.x = 0;
    player.y = 0;
    player.z = 0;

    io.to(roomId).emit('playerRespawned', player);
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    const room = rooms.get(roomId);

    if (!room) return;

    room.players.delete(socket.id);
    io.to(roomId).emit('playerLeft', socket.id);

    if (room.players.size === 0) rooms.delete(roomId);

    console.log('Disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Bharat Battle Royale server running on port ${PORT}`);
});

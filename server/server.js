import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import QRCode from 'qrcode';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable CORS for all routes and socket.io
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Serve client dist in production if built
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Multer storage for images and short videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `media-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 150 * 1024 * 1024 }, // 150 MB max per file
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Formato não suportado. Envie fotos ou vídeos curtos.'));
    }
  }
});

// Helper: Get local network IPv4 addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (127.0.0.1) and non-ipv4
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses.length > 0 ? addresses : ['localhost'];
}

// In-memory room state storage
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      tvSocketId: null,
      remotes: new Set(),
      playlist: [],
      currentIndex: 0,
      isPlaying: true,
      timerSeconds: 5,
      fitMode: 'contain', // 'contain' | 'cover'
      transition: 'smooth', // 'smooth' | 'fade' | 'zoom' | 'slide'
      autoVideoAdvance: true,
      updatedAt: Date.now()
    });
  }
  return rooms.get(roomId);
}

// API Routes
app.get('/api/info', (req, res) => {
  const ips = getLocalIpAddresses();
  res.json({
    primaryIp: ips[0],
    allIps: ips,
    port: PORT,
    clientPort: 5173
  });
});

// Upload media endpoint
app.post('/api/upload', upload.array('files', 30), (req, res) => {
  try {
    const files = req.files || [];
    const mediaItems = files.map((file) => {
      const isVideo = file.mimetype.startsWith('video/');
      return {
        id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        type: isVideo ? 'video' : 'image',
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
        duration: isVideo ? 0 : 5 // 0 for video = plays until end; images default to room timer
      };
    });

    res.json({ success: true, items: mediaItems });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 5e7 // 50MB
});

io.on('connection', (socket) => {
  let currentRoomId = null;
  let userRole = null; // 'tv' | 'remote'

  // TV requests to register/create a room
  socket.on('create-room', async (data, callback) => {
    const requestedId = (data?.roomId || Math.random().toString(36).substring(2, 6)).toUpperCase();
    currentRoomId = requestedId;
    userRole = 'tv';

    const room = getOrCreateRoom(requestedId);
    room.tvSocketId = socket.id;
    socket.join(requestedId);

    const ips = getLocalIpAddresses();
    const primaryIp = ips[0] || 'localhost';
    
    // Connect URL for the mobile phone
    // Ensure localhost/127.0.0.1 is replaced with actual LAN IP so phone can connect over Wi-Fi
    let host = socket.handshake.headers.host || `${primaryIp}:${PORT}`;
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      const portPart = host.split(':')[1] || PORT;
      host = `${primaryIp}:${portPart}`;
    }
    const remoteUrl = `http://${host}/?room=${requestedId}&role=remote`;

    // Generate QR code Data URL
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(remoteUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('QR code generation failed:', err);
    }

    const payload = {
      roomId: requestedId,
      remoteUrl,
      qrDataUrl,
      state: {
        playlist: room.playlist,
        currentIndex: room.currentIndex,
        isPlaying: room.isPlaying,
        timerSeconds: room.timerSeconds,
        fitMode: room.fitMode,
        transition: room.transition,
        autoVideoAdvance: room.autoVideoAdvance,
        remoteCount: room.remotes.size
      }
    };

    if (callback) callback(payload);
    socket.emit('room-created', payload);
  });

  // Mobile Remote joins room
  socket.on('join-room', (data, callback) => {
    const roomId = (data?.roomId || '').toUpperCase();
    if (!roomId) {
      if (callback) callback({ success: false, message: 'Código de sala inválido' });
      return;
    }

    currentRoomId = roomId;
    userRole = 'remote';
    const room = getOrCreateRoom(roomId);
    room.remotes.add(socket.id);
    socket.join(roomId);

    // Notify TV that a remote connected
    io.to(roomId).emit('remote-connected', {
      remoteId: socket.id,
      remoteCount: room.remotes.size
    });

    const roomState = {
      roomId,
      playlist: room.playlist,
      currentIndex: room.currentIndex,
      isPlaying: room.isPlaying,
      timerSeconds: room.timerSeconds,
      fitMode: room.fitMode,
      transition: room.transition,
      autoVideoAdvance: room.autoVideoAdvance,
      remoteCount: room.remotes.size
    };

    if (callback) callback({ success: true, state: roomState });
    socket.emit('joined-room', { success: true, state: roomState });
  });

  // Playlist management
  socket.on('update-playlist', (data) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (Array.isArray(data.playlist)) {
      room.playlist = data.playlist;
      if (room.currentIndex >= room.playlist.length) {
        room.currentIndex = Math.max(0, room.playlist.length - 1);
      }
      io.to(currentRoomId).emit('playlist-updated', {
        playlist: room.playlist,
        currentIndex: room.currentIndex
      });
    }
  });

  // Slide navigation
  socket.on('set-index', (data) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const index = parseInt(data.index, 10);
    if (!isNaN(index) && index >= 0 && index < room.playlist.length) {
      room.currentIndex = index;
      io.to(currentRoomId).emit('index-changed', {
        currentIndex: room.currentIndex,
        item: room.playlist[room.currentIndex]
      });
    }
  });

  socket.on('next-slide', () => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (room.playlist.length === 0) return;
    room.currentIndex = (room.currentIndex + 1) % room.playlist.length;
    io.to(currentRoomId).emit('index-changed', {
      currentIndex: room.currentIndex,
      item: room.playlist[room.currentIndex]
    });
  });

  socket.on('prev-slide', () => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (room.playlist.length === 0) return;
    room.currentIndex = (room.currentIndex - 1 + room.playlist.length) % room.playlist.length;
    io.to(currentRoomId).emit('index-changed', {
      currentIndex: room.currentIndex,
      item: room.playlist[room.currentIndex]
    });
  });

  // Playback control
  socket.on('toggle-play', (data) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    room.isPlaying = typeof data?.isPlaying === 'boolean' ? data.isPlaying : !room.isPlaying;
    io.to(currentRoomId).emit('play-state-changed', { isPlaying: room.isPlaying });
  });

  // Timer adjustment
  socket.on('set-timer', (data) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const seconds = Math.max(1, Math.min(300, parseInt(data.seconds, 10) || 5));
    room.timerSeconds = seconds;
    io.to(currentRoomId).emit('timer-changed', { timerSeconds: room.timerSeconds });
  });

  // Settings adjustment (fitMode, transition, etc.)
  socket.on('update-settings', (data) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (data.fitMode) room.fitMode = data.fitMode;
    if (data.transition) room.transition = data.transition;
    if (typeof data.autoVideoAdvance === 'boolean') room.autoVideoAdvance = data.autoVideoAdvance;
    
    io.to(currentRoomId).emit('settings-updated', {
      fitMode: room.fitMode,
      transition: room.transition,
      autoVideoAdvance: room.autoVideoAdvance
    });
  });

  // TV signals that current video ended
  socket.on('video-finished', () => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (room.autoVideoAdvance && room.isPlaying && room.playlist.length > 1) {
      room.currentIndex = (room.currentIndex + 1) % room.playlist.length;
      io.to(currentRoomId).emit('index-changed', {
        currentIndex: room.currentIndex,
        item: room.playlist[room.currentIndex]
      });
    }
  });

  // Disconnection cleanup
  socket.on('disconnect', () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      if (userRole === 'remote') {
        room.remotes.delete(socket.id);
        io.to(currentRoomId).emit('remote-disconnected', {
          remoteId: socket.id,
          remoteCount: room.remotes.size
        });
      } else if (userRole === 'tv' && room.tvSocketId === socket.id) {
        room.tvSocketId = null;
        io.to(currentRoomId).emit('tv-disconnected');
      }
    }
  });
});

// Fallback to client app for SPA routing
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(clientDist, 'index.html'))) {
    res.sendFile(path.join(clientDist, 'index.html'));
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Asperus Cast Server</title></head>
        <body style="background:#070709; color:#fff; font-family:sans-serif; text-align:center; padding-top:100px;">
          <h1>💎 Asperus Cast Server Ativo</h1>
          <p>O servidor está rodando na porta ${PORT}. Inicie o Vite em modo dev com: <code>npm run dev:client</code></p>
        </body>
      </html>
    `);
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`💎 Asperus Cast Server rodando em http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`📡 Acesso na rede local: http://${ip}:${PORT}`);
  });
  console.log(`======================================================\n`);
});

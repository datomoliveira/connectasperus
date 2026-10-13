import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import Peer from 'peerjs';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [syncMode, setSyncMode] = useState('connecting'); // 'websocket' | 'p2p' | 'connecting'
  const [roomData, setRoomData] = useState(null); // { roomId, remoteUrl, qrDataUrl, state }
  const [state, setState] = useState({
    playlist: [],
    currentIndex: 0,
    isPlaying: true,
    timerSeconds: 5,
    fitMode: 'contain',
    transition: 'smooth',
    autoVideoAdvance: true,
    remoteCount: 0
  });

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const peerConnsRef = useRef(new Set()); // On TV: active remote connections
  const remoteConnRef = useRef(null); // On Remote: active connection to TV
  const currentRoomIdRef = useRef('');
  const isHostTvRef = useRef(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    const isViteDev = window.location.port === '5173';
    const serverUrl = import.meta.env.VITE_BACKEND_URL || (isViteDev 
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin);

    try {
      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 4,
        timeout: 2500
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('⚡ Conectado ao servidor Socket.IO');
        setIsConnected(true);
        setSyncMode('websocket');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('room-created', (data) => {
        setRoomData(data);
        if (data.state) setState(data.state);
      });

      socket.on('joined-room', (data) => {
        if (data.state) setState((prev) => ({ ...prev, ...data.state }));
      });

      socket.on('remote-connected', ({ remoteCount }) => {
        setState((prev) => ({ ...prev, remoteCount }));
      });

      socket.on('remote-disconnected', ({ remoteCount }) => {
        setState((prev) => ({ ...prev, remoteCount }));
      });

      socket.on('playlist-updated', ({ playlist, currentIndex }) => {
        setState((prev) => ({ ...prev, playlist, currentIndex }));
      });

      socket.on('index-changed', ({ currentIndex }) => {
        setState((prev) => ({ ...prev, currentIndex }));
      });

      socket.on('play-state-changed', ({ isPlaying }) => {
        setState((prev) => ({ ...prev, isPlaying }));
      });

      socket.on('timer-changed', ({ timerSeconds }) => {
        setState((prev) => ({ ...prev, timerSeconds }));
      });

      socket.on('settings-updated', (newSettings) => {
        setState((prev) => ({ ...prev, ...newSettings }));
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn('Socket.IO indisponível, usando modo P2P serverless:', err);
    }
  }, []);

  // Helper to generate a random 4-letter room code (e.g. ASPR, NOVA)
  const generateRoomId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Broadcast data to all connected P2P remotes (when TV acts as host)
  const broadcastP2P = useCallback((payload) => {
    peerConnsRef.current.forEach((conn) => {
      if (conn && conn.open) {
        conn.send(payload);
      }
    });
  }, []);

  // Send data to TV (when Remote acts as client)
  const sendToHostP2P = useCallback((payload) => {
    if (remoteConnRef.current && remoteConnRef.current.open) {
      remoteConnRef.current.send(payload);
      return true;
    }
    return false;
  }, []);

  // Setup PeerJS for TV Host (Serverless P2P)
  const setupPeerHost = useCallback(async (roomId) => {
    isHostTvRef.current = true;
    const peerId = `asperus-cast-room-${roomId.toLowerCase()}`;

    try {
      if (peerRef.current) peerRef.current.destroy();

      const peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      peerRef.current = peer;

      peer.on('open', () => {
        console.log('📡 P2P WebRTC Host Ativo na Sala:', roomId);
        setIsConnected(true);
        setSyncMode('p2p');
      });

      peer.on('connection', (conn) => {
        console.log('📱 Celular conectou via P2P WebRTC!');
        peerConnsRef.current.add(conn);
        setIsConnected(true);
        setSyncMode('p2p');
        setState((prev) => ({ ...prev, remoteCount: peerConnsRef.current.size }));

        conn.on('open', () => {
          // Send initial state to the newly connected phone
          conn.send({
            type: 'sync-state',
            state: {
              playlist: state.playlist,
              currentIndex: state.currentIndex,
              isPlaying: state.isPlaying,
              timerSeconds: state.timerSeconds,
              fitMode: state.fitMode,
              transition: state.transition,
              autoVideoAdvance: state.autoVideoAdvance,
              remoteCount: peerConnsRef.current.size
            }
          });
        });

        conn.on('data', (data) => {
          if (!data || !data.type) return;

          switch (data.type) {
            case 'update-playlist':
              setState((prev) => {
                const updated = {
                  ...prev,
                  playlist: data.playlist,
                  currentIndex: Math.min(prev.currentIndex, Math.max(0, data.playlist.length - 1))
                };
                broadcastP2P({ type: 'sync-state', state: updated });
                return updated;
              });
              break;

            case 'set-index':
              setState((prev) => {
                const updated = { ...prev, currentIndex: data.index };
                broadcastP2P({ type: 'sync-state', state: updated });
                return updated;
              });
              break;

            case 'next-slide':
              setState((prev) => {
                if (prev.playlist.length === 0) return prev;
                const nextIdx = (prev.currentIndex + 1) % prev.playlist.length;
                const updated = { ...prev, currentIndex: nextIdx };
                broadcastP2P({ type: 'sync-state', state: updated });
                return updated;
              });
              break;

            case 'prev-slide':
              setState((prev) => {
                if (prev.playlist.length === 0) return prev;
                const prevIdx = (prev.currentIndex - 1 + prev.playlist.length) % prev.playlist.length;
                const updated = { ...prev, currentIndex: prevIdx };
                broadcastP2P({ type: 'sync-state', state: updated });
                return updated;
              });
              break;

            case 'toggle-play':
              setState((prev) => {
                const nextPlay = typeof data.isPlaying === 'boolean' ? data.isPlaying : !prev.isPlaying;
                const updated = { ...prev, isPlaying: nextPlay };
                broadcastP2P({ type: 'sync-state', state: updated });
                return updated;
              });
              break;

            case 'set-timer':
              setState((prev) => {
                const updated = { ...prev, timerSeconds: data.seconds };
                broadcastP2P({ type: 'sync-state', state: updated });
                return updated;
              });
              break;

            case 'update-settings':
              setState((prev) => {
                const updated = { ...prev, ...data.settings };
                broadcastP2P({ type: 'sync-state', state: updated });
                return updated;
              });
              break;

            default:
              break;
          }
        });

        conn.on('close', () => {
          peerConnsRef.current.delete(conn);
          setState((prev) => ({ ...prev, remoteCount: peerConnsRef.current.size }));
        });
      });

      peer.on('error', (err) => {
        // Peer already exists or connection fallback
        console.log('Peer info:', err.type);
      });
    } catch (e) {
      console.warn('PeerJS init failed:', e);
    }
  }, [state, broadcastP2P]);

  // Setup PeerJS for Mobile Remote Client
  const setupPeerClient = useCallback((roomId) => {
    isHostTvRef.current = false;
    const targetPeerId = `asperus-cast-room-${roomId.toLowerCase()}`;

    try {
      if (peerRef.current) peerRef.current.destroy();

      const peer = new Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });
      peerRef.current = peer;

      peer.on('open', () => {
        console.log('📱 Conectando à TV via WebRTC P2P...');
        const conn = peer.connect(targetPeerId, { reliable: true });
        remoteConnRef.current = conn;

        conn.on('open', () => {
          console.log('🎉 P2P Conectado diretamente à TV!');
          setIsConnected(true);
          setSyncMode('p2p');
        });

        conn.on('data', (data) => {
          if (data?.type === 'sync-state' && data.state) {
            setState((prev) => ({ ...prev, ...data.state }));
          }
        });

        conn.on('close', () => {
          console.log('Conexão P2P encerrada');
        });
      });
    } catch (e) {
      console.warn('PeerClient init failed:', e);
    }
  }, []);

  // CREATE ROOM: Instantly generates QR code client-side, then syncs with socket & peer
  const createRoom = useCallback(async (customRoomId = null) => {
    const roomId = (customRoomId || currentRoomIdRef.current || generateRoomId()).toUpperCase();
    currentRoomIdRef.current = roomId;

    const origin = window.location.origin;
    const remoteUrl = `${origin}/?room=${roomId}&role=remote`;

    // 1. Generate QR Code Data URL INSTANTLY in the browser (0ms delay)
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(remoteUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (err) {
      console.error('Falha ao gerar QR code:', err);
    }

    const initialPayload = {
      roomId,
      remoteUrl,
      qrDataUrl,
      state: {
        playlist: state.playlist,
        currentIndex: state.currentIndex,
        isPlaying: state.isPlaying,
        timerSeconds: state.timerSeconds,
        fitMode: state.fitMode,
        transition: state.transition,
        autoVideoAdvance: state.autoVideoAdvance,
        remoteCount: 0
      }
    };

    // Set roomData immediately so TV renders QR code without waiting for any server!
    setRoomData(initialPayload);

    // 2. Setup Serverless WebRTC P2P listener for this room
    setupPeerHost(roomId);

    // 3. If Socket.IO is connected, also register on the backend
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('create-room', { roomId }, (res) => {
        if (res) {
          setRoomData(res);
          if (res.state) setState(res.state);
        }
      });
    }
  }, [state, setupPeerHost]);

  // JOIN ROOM: Called by mobile remote
  const joinRoom = useCallback((roomId) => {
    const cleanId = (roomId || '').toUpperCase();
    if (!cleanId) return;
    currentRoomIdRef.current = cleanId;

    // Connect via Serverless P2P WebRTC
    setupPeerClient(cleanId);

    // If socket is connected, also join via Socket.IO
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-room', { roomId: cleanId }, (res) => {
        if (res?.success && res.state) {
          setState((prev) => ({ ...prev, ...res.state }));
        }
      });
    }
  }, [setupPeerClient]);

  // ACTIONS (Delivers via both P2P and Socket.IO)
  const updatePlaylist = useCallback((newPlaylist) => {
    setState((prev) => {
      const updated = {
        ...prev,
        playlist: newPlaylist,
        currentIndex: Math.min(prev.currentIndex, Math.max(0, newPlaylist.length - 1))
      };
      if (isHostTvRef.current) {
        broadcastP2P({ type: 'sync-state', state: updated });
      }
      return updated;
    });
    sendToHostP2P({ type: 'update-playlist', playlist: newPlaylist });
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('update-playlist', { playlist: newPlaylist });
    }
  }, [sendToHostP2P, broadcastP2P]);

  const setIndex = useCallback((index) => {
    setState((prev) => {
      const updated = { ...prev, currentIndex: index };
      if (isHostTvRef.current) {
        broadcastP2P({ type: 'sync-state', state: updated });
      }
      return updated;
    });
    sendToHostP2P({ type: 'set-index', index });
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('set-index', { index });
    }
  }, [sendToHostP2P, broadcastP2P]);

  const nextSlide = useCallback(() => {
    setState((prev) => {
      if (prev.playlist.length === 0) return prev;
      const nextIdx = (prev.currentIndex + 1) % prev.playlist.length;
      const updated = { ...prev, currentIndex: nextIdx };
      if (isHostTvRef.current) {
        broadcastP2P({ type: 'sync-state', state: updated });
      }
      return updated;
    });
    sendToHostP2P({ type: 'next-slide' });
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('next-slide');
    }
  }, [sendToHostP2P, broadcastP2P]);

  const prevSlide = useCallback(() => {
    setState((prev) => {
      if (prev.playlist.length === 0) return prev;
      const prevIdx = (prev.currentIndex - 1 + prev.playlist.length) % prev.playlist.length;
      const updated = { ...prev, currentIndex: prevIdx };
      if (isHostTvRef.current) {
        broadcastP2P({ type: 'sync-state', state: updated });
      }
      return updated;
    });
    sendToHostP2P({ type: 'prev-slide' });
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('prev-slide');
    }
  }, [sendToHostP2P, broadcastP2P]);

  const togglePlay = useCallback((desiredState = null) => {
    setState((prev) => {
      const nextPlay = typeof desiredState === 'boolean' ? desiredState : !prev.isPlaying;
      const updated = { ...prev, isPlaying: nextPlay };
      if (isHostTvRef.current) {
        broadcastP2P({ type: 'sync-state', state: updated });
      }
      return updated;
    });
    sendToHostP2P({ type: 'toggle-play', isPlaying: desiredState });
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('toggle-play', { isPlaying: desiredState });
    }
  }, [sendToHostP2P, broadcastP2P]);

  const setTimer = useCallback((seconds) => {
    setState((prev) => {
      const updated = { ...prev, timerSeconds: seconds };
      if (isHostTvRef.current) {
        broadcastP2P({ type: 'sync-state', state: updated });
      }
      return updated;
    });
    sendToHostP2P({ type: 'set-timer', seconds });
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('set-timer', { seconds });
    }
  }, [sendToHostP2P, broadcastP2P]);

  const updateSettings = useCallback((settings) => {
    setState((prev) => {
      const updated = { ...prev, ...settings };
      if (isHostTvRef.current) {
        broadcastP2P({ type: 'sync-state', state: updated });
      }
      return updated;
    });
    sendToHostP2P({ type: 'update-settings', settings });
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('update-settings', settings);
    }
  }, [sendToHostP2P, broadcastP2P]);

  const reportVideoFinished = useCallback(() => {
    if (isHostTvRef.current) {
      // Local TV handles video finished
      setState((prev) => {
        if (prev.autoVideoAdvance && prev.isPlaying && prev.playlist.length > 1) {
          const nextIdx = (prev.currentIndex + 1) % prev.playlist.length;
          const updated = { ...prev, currentIndex: nextIdx };
          broadcastP2P({ type: 'sync-state', state: updated });
          return updated;
        }
        return prev;
      });
    }
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('video-finished');
    }
  }, [broadcastP2P]);

  return {
    socket: socketRef.current,
    isConnected,
    syncMode,
    roomData,
    state,
    createRoom,
    joinRoom,
    updatePlaylist,
    setIndex,
    nextSlide,
    prevSlide,
    togglePlay,
    setTimer,
    updateSettings,
    reportVideoFinished
  };
}

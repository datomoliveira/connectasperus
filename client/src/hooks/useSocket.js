import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
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

  useEffect(() => {
    // In dev mode with Vite on port 5173, backend is on port 3001
    // In production, backend serves on same port
    const isViteDev = window.location.port === '5173';
    const serverUrl = isViteDev 
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : window.location.origin;

    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ Conectado ao servidor:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Desconectado do servidor');
      setIsConnected(false);
    });

    socket.on('room-created', (data) => {
      setRoomData(data);
      if (data.state) setState(data.state);
    });

    socket.on('joined-room', (data) => {
      if (data.state) {
        setState((prev) => ({ ...prev, ...data.state }));
      }
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
  }, []);

  const createRoom = useCallback((customRoomId = null) => {
    if (!socketRef.current) return;
    socketRef.current.emit('create-room', { roomId: customRoomId }, (res) => {
      if (res) {
        setRoomData(res);
        if (res.state) setState(res.state);
      }
    });
  }, []);

  const joinRoom = useCallback((roomId) => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false });
      socketRef.current.emit('join-room', { roomId }, (res) => {
        if (res?.success && res.state) {
          setState((prev) => ({ ...prev, ...res.state }));
        }
        resolve(res);
      });
    });
  }, []);

  const updatePlaylist = useCallback((newPlaylist) => {
    if (!socketRef.current) return;
    socketRef.current.emit('update-playlist', { playlist: newPlaylist });
  }, []);

  const setIndex = useCallback((index) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set-index', { index });
  }, []);

  const nextSlide = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('next-slide');
  }, []);

  const prevSlide = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('prev-slide');
  }, []);

  const togglePlay = useCallback((desiredState = null) => {
    if (!socketRef.current) return;
    socketRef.current.emit('toggle-play', { isPlaying: desiredState });
  }, []);

  const setTimer = useCallback((seconds) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set-timer', { seconds });
  }, []);

  const updateSettings = useCallback((settings) => {
    if (!socketRef.current) return;
    socketRef.current.emit('update-settings', settings);
  }, []);

  const reportVideoFinished = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('video-finished');
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
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

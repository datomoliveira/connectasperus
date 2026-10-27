import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

// ─────────────────────────────────────────────────────────────────────────────
// Asperus Cast — useSocket (HTTP Polling, serverless via Cloudflare Pages)
// Sync principal: POST /api/room (mobile) + GET /api/room?id=XXXX a cada 1.5s (TV)
// Sem WebRTC, sem Socket.IO, sem servidor externo — 100% gratuito na Cloudflare
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 1500;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [syncMode] = useState('cloud'); // sempre 'cloud' agora
  const [roomData, setRoomData] = useState(null);
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

  const currentRoomIdRef = useRef('');
  const isHostTvRef = useRef(false);
  const stateRef = useRef(state);
  const lastUpdatedAtRef = useRef(0);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Helper: GET room state from Cloudflare Function ────────────────────────
  const fetchRoomState = useCallback(async (roomId) => {
    try {
      const res = await fetch(`/api/room?id=${roomId}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.room || null;
    } catch {
      return null;
    }
  }, []);

  // ── Helper: POST room state update to Cloudflare Function ─────────────────
  const pushRoomState = useCallback(async (roomId, update) => {
    try {
      await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, ...update })
      });
      setIsConnected(true);
    } catch {
      // non-fatal — TV vai re-tentar no próximo poll
    }
  }, []);

  // ── Start TV polling loop ──────────────────────────────────────────────────
  const startPolling = useCallback((roomId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      const room = await fetchRoomState(roomId);
      if (!room) return;

      setIsConnected(true);

      // Só atualiza se houve mudança real desde o último sync
      if (room.updatedAt && room.updatedAt > lastUpdatedAtRef.current) {
        lastUpdatedAtRef.current = room.updatedAt;
        setState((prev) => ({
          ...prev,
          playlist: room.playlist ?? prev.playlist,
          currentIndex: room.currentIndex ?? prev.currentIndex,
          isPlaying: room.isPlaying ?? prev.isPlaying,
          timerSeconds: room.timerSeconds ?? prev.timerSeconds,
          fitMode: room.fitMode ?? prev.fitMode,
          remoteCount: room.remoteCount ?? prev.remoteCount
        }));
      }
    }, POLL_INTERVAL_MS);
  }, [fetchRoomState]);

  // ── CREATE ROOM (TV side) ──────────────────────────────────────────────────
  const generateRoomId = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  };

  const createRoom = useCallback(async (customRoomId = null) => {
    const roomId = (customRoomId || currentRoomIdRef.current || generateRoomId()).toUpperCase();
    currentRoomIdRef.current = roomId;
    isHostTvRef.current = true;

    const origin = window.location.origin;
    const remoteUrl = `${origin}/?room=${roomId}&role=remote`;

    // Gera QR Code no browser — instantâneo, sem esperar servidor
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(remoteUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 480,
        color: { dark: '#000000', light: '#ffffff' }
      });
    } catch (err) {
      console.error('QR falhou:', err);
    }

    const payload = { roomId, remoteUrl, qrDataUrl };
    setRoomData(payload);

    // Registra a sala na Cloudflare (não bloqueia o QR)
    await pushRoomState(roomId, {
      playlist: [],
      currentIndex: 0,
      isPlaying: true,
      timerSeconds: 5,
      fitMode: 'contain',
      remoteCount: 0
    });

    // Começa a escutar atualizações do celular via polling
    startPolling(roomId);
  }, [pushRoomState, startPolling]);

  // ── JOIN ROOM (Mobile side) ────────────────────────────────────────────────
  const joinRoom = useCallback(async (roomId) => {
    const cleanId = (roomId || '').toUpperCase().trim();
    if (!cleanId) return;
    currentRoomIdRef.current = cleanId;
    isHostTvRef.current = false;

    // Busca estado atual da sala
    const room = await fetchRoomState(cleanId);
    if (room) {
      setState((prev) => ({
        ...prev,
        playlist: room.playlist ?? prev.playlist,
        currentIndex: room.currentIndex ?? prev.currentIndex,
        isPlaying: room.isPlaying ?? prev.isPlaying,
        timerSeconds: room.timerSeconds ?? prev.timerSeconds,
        fitMode: room.fitMode ?? prev.fitMode
      }));
      lastUpdatedAtRef.current = room.updatedAt || 0;
      setIsConnected(true);
    }
  }, [fetchRoomState]);

  // ── Shared helper: push state to cloud ────────────────────────────────────
  const pushUpdate = useCallback((update) => {
    const roomId = currentRoomIdRef.current;
    if (!roomId) return;
    pushRoomState(roomId, update);
  }, [pushRoomState]);

  // ── ACTIONS (called by MobileRemote) ──────────────────────────────────────

  const updatePlaylist = useCallback((newPlaylist) => {
    setState((prev) => {
      const updated = {
        ...prev,
        playlist: newPlaylist,
        currentIndex: Math.min(prev.currentIndex, Math.max(0, newPlaylist.length - 1))
      };
      pushUpdate({ playlist: newPlaylist, currentIndex: updated.currentIndex });
      return updated;
    });
  }, [pushUpdate]);

  const setIndex = useCallback((index) => {
    setState((prev) => {
      const updated = { ...prev, currentIndex: index };
      pushUpdate({ currentIndex: index });
      return updated;
    });
  }, [pushUpdate]);

  const nextSlide = useCallback(() => {
    setState((prev) => {
      if (prev.playlist.length === 0) return prev;
      const nextIdx = (prev.currentIndex + 1) % prev.playlist.length;
      const updated = { ...prev, currentIndex: nextIdx };
      // Only push if mobile (TV handles locally via timer)
      if (!isHostTvRef.current) {
        pushUpdate({ currentIndex: nextIdx });
      }
      return updated;
    });
  }, [pushUpdate]);

  const prevSlide = useCallback(() => {
    setState((prev) => {
      if (prev.playlist.length === 0) return prev;
      const prevIdx = (prev.currentIndex - 1 + prev.playlist.length) % prev.playlist.length;
      const updated = { ...prev, currentIndex: prevIdx };
      if (!isHostTvRef.current) {
        pushUpdate({ currentIndex: prevIdx });
      }
      return updated;
    });
  }, [pushUpdate]);

  const togglePlay = useCallback((desiredState = null) => {
    setState((prev) => {
      const nextPlay = typeof desiredState === 'boolean' ? desiredState : !prev.isPlaying;
      const updated = { ...prev, isPlaying: nextPlay };
      pushUpdate({ isPlaying: nextPlay });
      return updated;
    });
  }, [pushUpdate]);

  const setTimer = useCallback((seconds) => {
    setState((prev) => {
      const updated = { ...prev, timerSeconds: seconds };
      pushUpdate({ timerSeconds: seconds });
      return updated;
    });
  }, [pushUpdate]);

  const updateSettings = useCallback((settings) => {
    setState((prev) => {
      const updated = { ...prev, ...settings };
      pushUpdate(settings);
      return updated;
    });
  }, [pushUpdate]);

  const reportVideoFinished = useCallback(() => {
    if (isHostTvRef.current) {
      setState((prev) => {
        if (prev.autoVideoAdvance && prev.isPlaying && prev.playlist.length > 1) {
          const nextIdx = (prev.currentIndex + 1) % prev.playlist.length;
          return { ...prev, currentIndex: nextIdx };
        }
        return prev;
      });
    }
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return {
    socket: null,
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

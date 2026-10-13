import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import TvDisplay from './components/TvDisplay';
import MobileRemote from './components/MobileRemote';
import QrScannerModal from './components/QrScannerModal';
import { Tv, Smartphone, Sparkles, RefreshCw } from 'lucide-react';
import LiquidGlassCard from './components/LiquidGlassCard';

export default function App() {
  const socketHook = useSocket();
  const { isConnected, joinRoom, state, createRoom, roomData } = socketHook;

  const [mode, setMode] = useState(null); // 'tv' | 'remote'
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    // Check URL parameters
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    const roomParam = params.get('room');

    if (roomParam) {
      setCurrentRoomId(roomParam.toUpperCase());
    }

    if (roleParam === 'remote' || roomParam) {
      setMode('remote');
      if (roomParam) {
        joinRoom(roomParam.toUpperCase());
      }
    } else if (roleParam === 'tv') {
      setMode('tv');
    } else {
      // Auto detect based on screen width / user agent
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      setMode(isMobile ? 'remote' : 'tv');
    }
  }, [joinRoom]);

  // Keep currentRoomId synced with roomData or state
  useEffect(() => {
    if (roomData?.roomId && !currentRoomId) {
      setCurrentRoomId(roomData.roomId);
    }
  }, [roomData, currentRoomId]);

  const handleJoinSpecificRoom = (code) => {
    setCurrentRoomId(code);
    joinRoom(code);
    // Update URL without reload
    const url = new URL(window.location);
    url.searchParams.set('role', 'remote');
    url.searchParams.set('room', code);
    window.history.replaceState({}, '', url);
  };

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    const url = new URL(window.location);
    url.searchParams.set('role', newMode);
    if (newMode === 'tv') {
      url.searchParams.delete('room');
    }
    window.history.replaceState({}, '', url);
  };

  // If still determining initial mode
  if (!mode) {
    return (
      <div className="w-screen h-screen bg-[#070709] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col font-sans select-none">
      
      {/* RENDER TV DISPLAY */}
      {mode === 'tv' && (
        <TvDisplay socketHook={socketHook} />
      )}

      {/* RENDER MOBILE REMOTE CONTROLLER */}
      {mode === 'remote' && (
        <MobileRemote
          socketHook={socketHook}
          roomId={currentRoomId || roomData?.roomId}
          onOpenScanner={() => setIsScannerOpen(true)}
          onSwitchMode={() => handleSwitchMode('tv')}
        />
      )}

      {/* MODAL: PAIR / JOIN ROOM */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onJoinRoom={handleJoinSpecificRoom}
      />
    </div>
  );
}

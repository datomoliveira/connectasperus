import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  Smartphone, 
  Play, 
  Pause, 
  Maximize, 
  Minimize, 
  Clock, 
  Sparkles, 
  Wifi, 
  Film, 
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import LiquidGlassCard from './LiquidGlassCard';

export default function TvDisplay({ socketHook }) {
  const { 
    roomData, 
    state, 
    createRoom, 
    nextSlide, 
    prevSlide, 
    togglePlay, 
    reportVideoFinished 
  } = socketHook;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100%
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  
  const videoRef = useRef(null);
  const hudTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Initialize room on mount if not yet created
  useEffect(() => {
    if (!roomData) {
      createRoom();
    }
  }, [roomData, createRoom]);

  // Live digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentItem = state.playlist[state.currentIndex] || null;
  const isVideo = currentItem?.type === 'video';

  // Slideshow auto-advance timer for images
  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setProgress(0);

    // If paused, or no items, or current item is a video (videos manage their own progress/end)
    if (!state.isPlaying || !currentItem || isVideo || state.playlist.length <= 1) {
      return;
    }

    const durationMs = (state.timerSeconds || 5) * 1000;
    const intervalStepMs = 100;
    let elapsedMs = 0;

    timerIntervalRef.current = setInterval(() => {
      elapsedMs += intervalStepMs;
      const pct = Math.min(100, (elapsedMs / durationMs) * 100);
      setProgress(pct);

      if (elapsedMs >= durationMs) {
        clearInterval(timerIntervalRef.current);
        nextSlide();
      }
    }, intervalStepMs);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [state.isPlaying, state.currentIndex, state.timerSeconds, currentItem, isVideo, state.playlist.length, nextSlide]);

  // Handle Video Time Update & End
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleVideoEnded = () => {
    setProgress(100);
    reportVideoFinished();
  };

  // Auto-hide HUD on idle
  useEffect(() => {
    const resetHud = () => {
      setShowHud(true);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      hudTimeoutRef.current = setTimeout(() => {
        if (state.playlist.length > 0) {
          setShowHud(false);
        }
      }, 4000);
    };

    resetHud();
    window.addEventListener('mousemove', resetHud);
    window.addEventListener('touchstart', resetHud);

    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
      window.removeEventListener('mousemove', resetHud);
      window.removeEventListener('touchstart', resetHud);
    };
  }, [state.currentIndex, state.playlist.length]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation on TV (space, left, right, f)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') nextSlide();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') prevSlide();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, togglePlay]);

  return (
    <div className="relative w-screen h-screen bg-[#050608] overflow-hidden select-none flex flex-col justify-between">
      {/* Background Ambient Glow & Mesh */}
      <div className="absolute inset-0 bg-ambient-mesh opacity-90 pointer-events-none" />

      {/* NO MEDIA / PAIRING SCREEN */}
      {state.playlist.length === 0 ? (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-8 text-center">
          
          {/* Header Brand */}
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl glass-button flex items-center justify-center shadow-specular">
              <Tv className="w-6 h-6 text-slate-200" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ASPERUS CAST
              </h1>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                Transmissão Inteligente para TV
              </p>
            </div>
          </div>

          {/* Main Glass Pairing Card */}
          <LiquidGlassCard className="max-w-xl w-full p-8 md:p-10 flex flex-col items-center border-white/15">
            <div className="relative mb-6 group">
              {/* Pulsing ring around QR code */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-500/20 via-slate-400/20 to-purple-500/20 blur-xl opacity-75 animate-pulse-slow pointer-events-none" />
              
              <div className="relative bg-white p-4 rounded-2xl shadow-2xl border border-white/20">
                {roomData?.qrDataUrl ? (
                  <img 
                    src={roomData.qrDataUrl} 
                    alt="Conectar via QR Code" 
                    className="w-64 h-64 md:w-72 md:h-72 object-contain" 
                  />
                ) : (
                  <div className="w-64 h-64 md:w-72 md:h-72 flex items-center justify-center text-slate-800">
                    <span className="animate-spin text-2xl font-bold">●</span>
                  </div>
                )}
              </div>
            </div>

            {/* Room Code Callout */}
            <div className="mb-4 text-center">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">Código da Sala</span>
              <div className="text-4xl md:text-5xl font-extrabold tracking-widest bg-gradient-to-b from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mt-1">
                {roomData?.roomId || '----'}
              </div>
            </div>

            {/* Step instructions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-300 mt-2 bg-slate-900/60 py-3 px-5 rounded-2xl border border-white/10 w-full">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400 shrink-0" />
                <span>1. Abra a câmera do celular</span>
              </div>
              <span className="hidden sm:inline text-slate-600">•</span>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                <span>2. Escaneie para controlar</span>
              </div>
            </div>

            {/* Direct URL info */}
            {roomData?.remoteUrl && (
              <div className="mt-4 text-xs text-slate-500">
                Ou acesse pelo navegador: <span className="text-slate-300 font-mono select-all">{roomData.remoteUrl}</span>
              </div>
            )}
          </LiquidGlassCard>

          {/* TV Footer Status */}
          <div className="mt-8 flex items-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>
                {state.remoteCount > 0 
                  ? `${state.remoteCount} celular(es) conectado(s)` 
                  : 'Aguardando conexão do celular...'}
              </span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {currentTimeStr}
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE SLIDESHOW SCREEN */
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          
          {/* Media Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isVideo ? (
              <video
                ref={videoRef}
                key={currentItem.url}
                src={currentItem.url}
                autoPlay
                playsInline
                className={`w-full h-full ${
                  state.fitMode === 'cover' ? 'object-cover' : 'object-contain'
                } transition-all duration-700`}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
              />
            ) : (
              <img
                key={currentItem.url}
                src={currentItem.url}
                alt={currentItem.name || 'Slide'}
                className={`w-full h-full ${
                  state.fitMode === 'cover' ? 'object-cover' : 'object-contain'
                } transition-all duration-700 animate-fadeIn`}
              />
            )}
          </div>

          {/* Ambient Edge Vignette */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40" />

          {/* FLOATING LIQUID GLASS HUD (Auto-hide on idle) */}
          <div 
            className={`
              absolute inset-x-0 bottom-0 p-6 md:p-8 flex flex-col gap-3
              transition-all duration-500
              ${showHud ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}
            `}
          >
            {/* Top row of HUD: Meta Info & Status */}
            <div className="flex items-center justify-between">
              
              {/* Slide Meta Card */}
              <div className="flex items-center gap-3 glass-panel-subtle px-4 py-2 rounded-2xl border-white/10 shadow-lg">
                <div className="p-1.5 rounded-lg bg-white/10 text-white">
                  {isVideo ? <Film className="w-4 h-4 text-purple-400" /> : <ImageIcon className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white tracking-wide truncate max-w-xs md:max-w-md">
                    {currentItem.name || `Mídia #${state.currentIndex + 1}`}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Slide {state.currentIndex + 1} de {state.playlist.length} {isVideo ? '• Vídeo Curto' : `• Timer ${state.timerSeconds}s`}
                  </span>
                </div>
              </div>

              {/* Status and Controls */}
              <div className="flex items-center gap-3">
                {/* Room Pill */}
                <div className="glass-panel-subtle px-3 py-1.5 rounded-xl border-white/10 text-xs font-mono font-bold tracking-wider text-slate-200">
                  SALA {roomData?.roomId}
                </div>

                {/* Clock */}
                <div className="glass-panel-subtle px-3 py-1.5 rounded-xl border-white/10 flex items-center gap-1.5 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{currentTimeStr}</span>
                </div>

                {/* Play / Pause Toggle Button */}
                <button
                  onClick={togglePlay}
                  className="glass-button p-2.5 rounded-xl text-white hover:text-blue-400 cursor-pointer"
                  title={state.isPlaying ? "Pausar" : "Reproduzir"}
                >
                  {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="glass-button p-2.5 rounded-xl text-white hover:text-blue-400 cursor-pointer"
                  title="Tela Cheia (F)"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bottom Progress Bar (Liquid Glass Glow) */}
            <div className="relative w-full h-2 rounded-full overflow-hidden bg-white/10 backdrop-blur-md border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 transition-all duration-100 shadow-[0_0_12px_rgba(129,140,248,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Quick Manual Arrow buttons on hover */}
          <button 
            onClick={prevSlide}
            className={`
              absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-2xl glass-button text-white/70 hover:text-white
              transition-opacity duration-300 cursor-pointer
              ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextSlide}
            className={`
              absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-2xl glass-button text-white/70 hover:text-white
              transition-opacity duration-300 cursor-pointer
              ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}
            `}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

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
import QRCode from 'qrcode';

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
  const [localQr, setLocalQr] = useState('');
  const [localRoomId, setLocalRoomId] = useState('');
  
  const videoRef = useRef(null);
  const hudTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Initialize room on mount if not yet created
  useEffect(() => {
    if (!roomData) {
      createRoom();
    }
  }, [roomData, createRoom]);

  // Instant client-side QR Code generation guarantee
  useEffect(() => {
    const activeId = (roomData?.roomId || localRoomId || 'ASPR').toUpperCase();
    if (!localRoomId) setLocalRoomId(activeId);

    if (!roomData?.qrDataUrl && !localQr) {
      const targetUrl = `${window.location.origin}/?room=${activeId}&role=remote`;
      QRCode.toDataURL(targetUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 480,
        color: { dark: '#000000', light: '#ffffff' }
      }).then((url) => {
        setLocalQr(url);
      }).catch((err) => {
        console.error('Erro ao gerar QR Code local:', err);
      });
    }
  }, [roomData, localQr, localRoomId]);

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

  const nextSlideRef = useRef(nextSlide);
  useEffect(() => {
    nextSlideRef.current = nextSlide;
  });

  const playlistLength = state.playlist.length;
  const currentIndex = state.currentIndex;
  const isPlaying = state.isPlaying;
  const timerSeconds = state.timerSeconds || 5;
  const currentItem = state.playlist[currentIndex] || null;
  const isVideo = currentItem?.type === 'video';

  // Slideshow auto-advance timer for images
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setProgress(0);

    // If not playing, or less than 2 items, or is video, don't run image timer
    if (!isPlaying || playlistLength <= 1 || isVideo) {
      return;
    }

    const durationMs = timerSeconds * 1000;
    const startTime = Date.now();

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (elapsed >= durationMs) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        setProgress(0);
        if (nextSlideRef.current) {
          nextSlideRef.current();
        }
      }
    }, 50);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPlaying, currentIndex, timerSeconds, playlistLength, isVideo]);

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
    if (nextSlideRef.current) {
      nextSlideRef.current();
    }
  };

  // Video Autoplay & Watchdog to guarantee sequence NEVER stalls
  useEffect(() => {
    if (!isVideo || !isPlaying) return;

    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch((err) => {
        console.warn('Autoplay bloqueado pelo navegador, mutando:', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }

    // Safety Watchdog: max 30 seconds per video to prevent any freeze
    const watchdogTimer = setTimeout(() => {
      console.log('⏰ Watchdog de vídeo: avançando slide travado');
      if (nextSlideRef.current) {
        nextSlideRef.current();
      }
    }, 30000);

    return () => clearTimeout(watchdogTimer);
  }, [isVideo, currentIndex, isPlaying]);

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

      {/* NO MEDIA / PAIRING SCREEN (WIDESCREEN 16:9 TV OPTIMIZED) */}
      {state.playlist.length === 0 ? (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto overflow-y-auto sm:overflow-hidden">
          
          {/* Top Header Bar */}
          <div className="flex items-center justify-between w-full shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl glass-button flex items-center justify-center shadow-specular">
                <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-slate-200" />
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-black tracking-wider text-white">
                  ASPERUS CAST
                </h1>
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400 font-semibold font-mono">
                  Transmissão Inteligente para TV
                </p>
              </div>
            </div>

            {/* TV Controls & Live Clock */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{currentTimeStr}</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="px-3.5 py-1.5 rounded-xl glass-button text-xs font-semibold text-slate-300 hover:text-white border-white/10 shadow-specular flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                title="Alternar Tela Cheia (Tecla F)"
              >
                {isFullscreen ? <Minimize className="w-4 h-4 text-blue-400" /> : <Maximize className="w-4 h-4 text-blue-400" />}
                <span className="hidden sm:inline">{isFullscreen ? 'Sair' : 'Tela Cheia'}</span>
              </button>
            </div>
          </div>

          {/* Main Pairing Card: 2 Columns for 16:9 Smart TVs */}
          <div className="flex-1 flex items-center justify-center my-auto py-2 sm:py-4">
            <LiquidGlassCard className="w-full max-w-4xl p-5 sm:p-7 md:p-8 border-white/15 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
                
                {/* Left Column: Instructions & Room Code */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[11px] font-semibold tracking-wider uppercase mb-1.5">
                      Pareamento Rápido
                    </span>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                      Conecte seu Celular
                    </h2>
                    <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                      Funciona com Android e iPhone direto pela câmera.
                    </p>
                  </div>

                  {/* Room Code Callout */}
                  <div className="w-full bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 flex flex-col items-center md:items-start">
                    <span className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">
                      Código da Sala
                    </span>
                    <div className="text-3xl sm:text-4xl font-black tracking-widest text-white font-mono mt-0.5">
                      {roomData?.roomId || localRoomId || 'ASPR'}
                    </div>
                  </div>

                  {/* Step Instructions */}
                  <div className="space-y-2 w-full text-xs sm:text-sm text-slate-300">
                    <div className="flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        1
                      </div>
                      <span>Abra a <strong>câmera</strong> do Android ou iPhone</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-xl border border-white/5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                        2
                      </div>
                      <span>Aponte para o <strong>QR Code</strong> ao lado</span>
                    </div>
                  </div>

                  {/* Direct Link Info & Optional Simulator Button */}
                  <div className="pt-1 text-[11px] text-slate-400 font-mono break-all text-center md:text-left w-full">
                    <span>Ou acesse: </span>
                    <span className="text-blue-300 font-semibold select-all">
                      {roomData?.remoteUrl || `${window.location.origin}/?room=${roomData?.roomId || localRoomId || 'ASPR'}&role=remote`}
                    </span>
                  </div>

                  {/* Optional PC test link (hidden on small viewports) */}
                  <a
                    href={roomData?.remoteUrl || `/?room=${roomData?.roomId || localRoomId || 'ASPR'}&role=remote`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold glass-button text-slate-400 hover:text-white border-white/10 shadow-specular transition-all cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>Testar controle no PC</span>
                  </a>
                </div>

                {/* Right Column: Perfect Square QR Code */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative group">
                    {/* Ambient Glow */}
                    <div className="absolute -inset-3 rounded-3xl bg-gradient-to-r from-blue-500/30 via-slate-400/20 to-purple-500/30 blur-xl opacity-80 animate-pulse-slow pointer-events-none" />
                    
                    {/* Pure White Container - Guaranteed High Contrast and Quiet Zone */}
                    <div className="relative bg-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border-2 border-white/40 flex items-center justify-center">
                      {(roomData?.qrDataUrl || localQr) ? (
                        <img 
                          src={roomData?.qrDataUrl || localQr} 
                          alt="Conectar via QR Code" 
                          className="w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 lg:w-64 lg:h-64 object-contain aspect-square rounded-xl block shadow-inner" 
                        />
                      ) : (
                        <div className="w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 flex flex-col items-center justify-center text-slate-800 gap-2">
                          <span className="animate-spin text-2xl font-bold">●</span>
                          <span className="text-xs font-semibold text-slate-600">Gerando QR...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Aponte a câmera a até 3 metros</span>
                  </div>
                </div>

              </div>
            </LiquidGlassCard>
          </div>

          {/* Bottom Footer Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-300">
                {state.remoteCount > 0 
                  ? `${state.remoteCount} celular(es) conectado(s)` 
                  : 'Aguardando celular conectar...'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <Wifi className="w-3.5 h-3.5 text-slate-400" />
              <span>{window.location.hostname}</span>
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
                muted
                className={`w-full h-full ${
                  state.fitMode === 'cover' ? 'object-cover' : 'object-contain'
                } transition-all duration-700`}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
                onError={(e) => {
                  console.warn('Erro ao reproduzir vídeo na TV, avançando:', e);
                  setTimeout(() => {
                    if (nextSlideRef.current) nextSlideRef.current();
                  }, 1200);
                }}
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

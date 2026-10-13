import React, { useState, useRef } from 'react';
import { 
  Tv, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Upload, 
  Image as ImageIcon, 
  Film, 
  Trash2, 
  Sliders, 
  Clock, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Sparkles,
  Smartphone,
  Layers,
  RefreshCw,
  Camera,
  Cast,
  CheckCircle2,
  Wifi
} from 'lucide-react';
import LiquidGlassCard from './LiquidGlassCard';
import { useCast } from '../hooks/useCast';
import DirectCastModal from './DirectCastModal';
import CameraScannerModal from './CameraScannerModal';

export default function MobileRemote({ 
  socketHook, 
  roomId, 
  onSwitchMode,
  onJoinRoom
}) {
  const castHook = useCast(roomId);
  const [isDirectCastOpen, setIsDirectCastOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  
  const { 
    state, 
    isConnected,
    syncMode,
    updatePlaylist, 
    setIndex, 
    nextSlide, 
    prevSlide, 
    togglePlay, 
    setTimer, 
    updateSettings 
  } = socketHook;

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const currentItem = state.playlist[state.currentIndex] || null;

  // Handle camera QR code scan result
  const handleQrScanned = (scannedCode) => {
    if (onJoinRoom) {
      onJoinRoom(scannedCode);
    }
  };

  // Upload photos and videos from phone
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      let mediaItems = [];

      // 1. Try backend upload API if URL is configured or on local development
      const isViteDev = window.location.port === '5173';
      const baseUrl = import.meta.env.VITE_BACKEND_URL || (isViteDev 
        ? `${window.location.protocol}//${window.location.hostname}:3001` 
        : '');

      if (baseUrl) {
        try {
          const response = await fetch(`${baseUrl}/api/upload`, {
            method: 'POST',
            body: formData,
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.items) {
              mediaItems = data.items;
            }
          }
        } catch (apiErr) {
          console.warn('API backend indisponível, processando no celular:', apiErr);
        }
      }

      // 2. If backend was unavailable (e.g. on Cloudflare Pages static hosting),
      // read files directly in the browser as Data URLs (works 100% serverless!)
      if (mediaItems.length === 0) {
        const filePromises = files.map((file) => {
          return new Promise((resolve) => {
            const isVid = (file.type || '').startsWith('video/');
            const reader = new FileReader();
            reader.onload = (event) => {
              resolve({
                id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
                type: isVid ? 'video' : 'image',
                name: file.name,
                url: event.target.result,
                duration: isVid ? 0 : 5
              });
            };
            reader.readAsDataURL(file);
          });
        });

        mediaItems = await Promise.all(filePromises);
      }

      if (mediaItems.length > 0) {
        const updated = [...state.playlist, ...mediaItems];
        updatePlaylist(updated);
      }
    } catch (err) {
      console.error('Falha ao carregar mídias:', err);
      alert('Erro ao carregar mídia. Tente novamente.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load sample demo media
  const handleLoadDemoMedia = () => {
    const demoItems = [
      {
        id: 'demo-1',
        type: 'image',
        name: 'Nebulosa Cósmica Estelar',
        url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
        duration: 5
      },
      {
        id: 'demo-2',
        type: 'image',
        name: 'Montanhas Glaciais Reflexivas',
        url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
        duration: 5
      },
      {
        id: 'demo-3',
        type: 'video',
        name: 'Aurora Boreal Cósmica (Vídeo)',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        duration: 0
      },
      {
        id: 'demo-4',
        type: 'image',
        name: 'Cyberpunk Metrópole Noturna',
        url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80',
        duration: 5
      }
    ];

    updatePlaylist([...state.playlist, ...demoItems]);
  };

  const moveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.playlist.length) return;
    const items = [...state.playlist];
    const [moved] = items.splice(index, 1);
    items.splice(newIndex, 0, moved);
    updatePlaylist(items);
  };

  const removeItem = (index) => {
    const items = state.playlist.filter((_, i) => i !== index);
    updatePlaylist(items);
  };

  const clearPlaylist = () => {
    if (window.confirm('Deseja limpar todas as mídias da TV?')) {
      updatePlaylist([]);
    }
  };

  const timerPresets = [3, 5, 10, 15, 30];

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col pb-20 relative select-none">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-ambient-mesh opacity-70 pointer-events-none" />

      {/* COMPACT CLEAN MOBILE HEADER (NO WRAPPING / NO SQUEEZING) */}
      <header className="sticky top-0 z-40 px-4 pt-safe pt-3 pb-2.5 glass-panel-subtle border-b border-white/10 flex items-center justify-between gap-2">
        {/* Brand & Room Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center shrink-0 shadow-specular">
            <Smartphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-extrabold text-white tracking-tight truncate">Asperus</span>
            <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 whitespace-nowrap">
              {roomId ? `SALA ${roomId}` : 'SEM SALA'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* CAMERA SCAN TV QR CODE BUTTON */}
          <button
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-2.5 py-1.5 rounded-xl glass-button text-blue-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer border-blue-400/30 shadow-specular active:scale-95"
            title="Abrir Câmera para Escanear QR Code da TV"
          >
            <Camera className="w-3.5 h-3.5 text-blue-400" />
            <span className="whitespace-nowrap">Escanear TV</span>
          </button>

          {/* Cast TV Button */}
          <button
            onClick={() => setIsDirectCastOpen(true)}
            className={`p-2 rounded-xl glass-button flex items-center justify-center cursor-pointer transition-all ${
              castHook.isCasting
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-neon-graphite'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Conexão Direta Sem Fio (Chromecast/AirPlay)"
          >
            <Cast className="w-3.5 h-3.5" />
          </button>

          {/* View TV mode button */}
          <button
            onClick={onSwitchMode}
            className="p-2 rounded-xl glass-button text-purple-300 hover:text-white cursor-pointer"
            title="Ver Modo Telão da TV"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 px-3.5 py-4 max-w-md mx-auto w-full flex flex-col gap-3.5 relative z-10">
        
        {/* CONNECTION STATUS PILL */}
        <div 
          onClick={() => setIsCameraScannerOpen(true)}
          className={`
            px-3 py-2 rounded-xl flex items-center justify-between gap-2 border cursor-pointer transition-all
            ${isConnected 
              ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-200' 
              : 'bg-blue-950/30 border-blue-500/20 text-blue-200 hover:bg-blue-900/40'}
          `}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-blue-400'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-blue-500'}`} />
            </span>
            <span className="text-[11px] font-semibold truncate">
              {isConnected 
                ? `TV Conectada • Sala ${roomId || 'ASPR'}` 
                : 'Toque para escanear o QR Code da TV'}
            </span>
          </div>
          <span className="text-[10px] uppercase font-bold text-blue-400 shrink-0 flex items-center gap-1">
            <Camera className="w-3 h-3" />
            Escanear
          </span>
        </div>

        {/* HERO TV PREVIEW CARD */}
        <LiquidGlassCard className="p-3.5 flex flex-col gap-3 border-white/15">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-bold text-[11px] flex items-center gap-1 text-slate-300 whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              Na Tela da TV
            </span>
            <span className="font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded-md border border-white/10 text-white whitespace-nowrap">
              {state.playlist.length > 0 ? `${state.currentIndex + 1} / ${state.playlist.length}` : 'Vazio'}
            </span>
          </div>

          {/* Media Preview Box */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
            {currentItem ? (
              currentItem.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video 
                    src={currentItem.url} 
                    className="w-full h-full object-contain pointer-events-none" 
                    muted 
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="px-2.5 py-1 rounded-full bg-purple-600/80 backdrop-blur-md text-[11px] font-bold text-white flex items-center gap-1.5 shadow">
                      <Film className="w-3 h-3" /> Vídeo Curto
                    </span>
                  </div>
                </div>
              ) : (
                <img
                  src={currentItem.url}
                  alt={currentItem.name}
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-4 text-center">
                <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                <span className="text-xs">Nenhuma foto ou vídeo na TV</span>
                <button
                  onClick={handleLoadDemoMedia}
                  className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-xl glass-button text-blue-300 border-blue-500/30 flex items-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  Carregar Demonstração
                </button>
              </div>
            )}
          </div>

          {/* TACTILE PLAYBACK BUTTONS (LARGE TOUCH TARGETS) */}
          <div className="flex items-center justify-between gap-2.5 pt-1">
            <button
              onClick={prevSlide}
              disabled={state.playlist.length <= 1}
              className="flex-1 py-3 rounded-xl glass-button flex items-center justify-center text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white active:scale-95 cursor-pointer"
              title="Slide Anterior"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              disabled={state.playlist.length === 0}
              className={`
                flex-[1.8] py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs tracking-wider uppercase
                disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer transition-all
                ${state.isPlaying 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400/40' 
                  : 'glass-button text-slate-200 hover:text-white'}
              `}
            >
              {state.isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Passar</span>
                </>
              )}
            </button>

            <button
              onClick={nextSlide}
              disabled={state.playlist.length <= 1}
              className="flex-1 py-3 rounded-xl glass-button flex items-center justify-center text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white active:scale-95 cursor-pointer"
              title="Próximo Slide"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </LiquidGlassCard>

        {/* TIMER CONTROLLER CARD */}
        <LiquidGlassCard className="p-3.5 flex flex-col gap-3 border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-xs font-bold text-white tracking-wide whitespace-nowrap">
                Timer Entre Imagens
              </span>
            </div>
            <span className="text-sm font-extrabold font-mono text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/20 whitespace-nowrap">
              {state.timerSeconds}s
            </span>
          </div>

          {/* Slider */}
          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={state.timerSeconds || 5}
              onChange={(e) => setTimer(Number(e.target.value))}
              className="w-full cursor-pointer accent-blue-500 h-2"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1s</span>
              <span>15s</span>
              <span>30s</span>
              <span>60s</span>
            </div>
          </div>

          {/* Clean Preset Chips */}
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {timerPresets.map((sec) => (
              <button
                key={sec}
                onClick={() => setTimer(sec)}
                className={`
                  py-1.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap
                  ${state.timerSeconds === sec 
                    ? 'bg-blue-600 text-white shadow border border-blue-400/50' 
                    : 'glass-panel-subtle text-slate-300 hover:text-white border-white/5'}
                `}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Display Mode Switcher (Fit vs Fill) */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Enquadramento na TV</span>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
              <button
                onClick={() => updateSettings({ fitMode: 'contain' })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                  state.fitMode === 'contain' 
                    ? 'bg-white/20 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ajustar
              </button>
              <button
                onClick={() => updateSettings({ fitMode: 'cover' })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                  state.fitMode === 'cover' 
                    ? 'bg-white/20 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Preencher
              </button>
            </div>
          </div>
        </LiquidGlassCard>

        {/* MEDIA UPLOADER & PLAYLIST */}
        <LiquidGlassCard className="p-3.5 flex flex-col gap-3 border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-bold text-white tracking-wide whitespace-nowrap">
                Fila de Mídias ({state.playlist.length})
              </span>
            </div>
            {state.playlist.length > 0 && (
              <button
                onClick={clearPlaylist}
                className="text-[11px] text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors whitespace-nowrap"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Action buttons: Upload File & Demo */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,video/mp4,video/webm"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="py-2.5 px-3 rounded-xl glass-button border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-500/10 cursor-pointer shadow-specular active:scale-95"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span className="whitespace-nowrap">Enviando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span className="whitespace-nowrap">+ Fotos/Vídeos</span>
                </>
              )}
            </button>

            <button
              onClick={handleLoadDemoMedia}
              className="py-2.5 px-3 rounded-xl glass-button text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-purple-500/10 cursor-pointer shadow-specular active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="whitespace-nowrap">Demo Rápida</span>
            </button>
          </div>

          {/* Media Items List */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
            {state.playlist.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-slate-400 border border-dashed border-white/10 rounded-xl px-2">
                Nenhuma mídia adicionada. Toque em <strong>+ Fotos/Vídeos</strong> para selecionar do celular.
              </div>
            ) : (
              state.playlist.map((item, idx) => {
                const isSelected = state.currentIndex === idx;
                return (
                  <div
                    key={item.id || idx}
                    className={`
                      p-2 rounded-xl flex items-center gap-2.5 transition-all
                      ${isSelected 
                        ? 'bg-blue-900/30 border border-blue-400/50 shadow' 
                        : 'glass-panel-subtle hover:bg-white/5 border-white/5'}
                    `}
                  >
                    {/* Thumbnail */}
                    <div 
                      onClick={() => setIndex(idx)}
                      className="relative w-11 h-11 rounded-lg overflow-hidden bg-black/60 shrink-0 cursor-pointer border border-white/10"
                    >
                      {item.type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-purple-400">
                          <Film className="w-4 h-4" />
                        </div>
                      ) : (
                        <img 
                          src={item.url} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 ring-1.5 ring-blue-400 ring-inset" />
                      )}
                    </div>

                    {/* Meta */}
                    <div 
                      onClick={() => setIndex(idx)}
                      className="flex-1 min-w-0 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded ${
                          item.type === 'video' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {item.type === 'video' ? 'Vídeo' : 'Foto'}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-emerald-400">
                            • Na TV
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-semibold text-slate-200 truncate mt-0.5">
                        {item.name || `Item #${idx + 1}`}
                      </p>
                    </div>

                    {/* Order Controls */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveItem(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                        title="Subir"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveItem(idx, 1)}
                        disabled={idx === state.playlist.length - 1}
                        className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                        title="Descer"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-400 ml-0.5"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </LiquidGlassCard>
      </main>

      {/* MODAL 1: REAL CAMERA QR SCANNER (POINTS CAMERA AT TV) */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanned={handleQrScanned}
      />

      {/* MODAL 2: DIRECT WIRELESS CAST */}
      <DirectCastModal
        isOpen={isDirectCastOpen}
        onClose={() => setIsDirectCastOpen(false)}
        castHook={castHook}
        roomId={roomId}
        onOpenQrMode={() => setIsCameraScannerOpen(true)}
      />
    </div>
  );
}

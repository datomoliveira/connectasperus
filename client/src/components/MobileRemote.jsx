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
  Maximize2, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  Layers,
  RefreshCw,
  QrCode,
  Cast,
  Radio
} from 'lucide-react';
import LiquidGlassCard from './LiquidGlassCard';
import { useCast } from '../hooks/useCast';
import DirectCastModal from './DirectCastModal';

export default function MobileRemote({ 
  socketHook, 
  roomId, 
  onOpenScanner, 
  onSwitchMode 
}) {
  const castHook = useCast(roomId);
  const [isDirectCastOpen, setIsDirectCastOpen] = useState(false);
  const { 
    state, 
    updatePlaylist, 
    setIndex, 
    nextSlide, 
    prevSlide, 
    togglePlay, 
    setTimer, 
    updateSettings 
  } = socketHook;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('control'); // 'control' | 'playlist' | 'settings'
  const fileInputRef = useRef(null);

  const currentItem = state.playlist[state.currentIndex] || null;

  // Handle uploading files from phone
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      let mediaItems = [];

      // Try backend upload API if URL is configured or on local development
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
          console.warn('API backend indisponível, processando no navegador:', apiErr);
        }
      }

      // If backend was unavailable (e.g. on Cloudflare Pages static hosting),
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
      console.error('Falha ao processar mídias:', err);
      alert('Erro ao carregar mídia. Tente novamente.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load High-Quality Demo Media
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
        name: 'Vídeo Curto: Aurora Boreal Cósmica',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        duration: 0
      },
      {
        id: 'demo-4',
        type: 'image',
        name: 'Cyberpunk Metrópole Noturna',
        url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80',
        duration: 5
      },
      {
        id: 'demo-5',
        type: 'video',
        name: 'Vídeo Curto: Chamas e Fluidos',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        duration: 0
      }
    ];

    updatePlaylist([...state.playlist, ...demoItems]);
  };

  // Reordering & Deletion
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

  const timerPresets = [3, 5, 8, 10, 15, 30];

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col pb-24 relative select-none">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-ambient-mesh opacity-70 pointer-events-none" />

      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 px-5 pt-safe pt-4 pb-3 glass-panel-subtle border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl glass-button flex items-center justify-center shadow-specular">
            <Smartphone className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">Asperus Remote</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                SALA {roomId || '---'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">PWA Controller Conectado</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Cast to TV Button (Option 2: Direct Connection) */}
          <button
            onClick={() => setIsDirectCastOpen(true)}
            className={`p-2.5 rounded-xl glass-button flex items-center gap-1.5 transition-all cursor-pointer ${
              castHook.isCasting
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-neon-graphite'
                : 'text-blue-300 border-blue-500/30 hover:text-white'
            }`}
            title="Transmitir Direto para TV (Sem Navegador)"
          >
            <Cast className={`w-4 h-4 ${castHook.isCasting ? 'text-emerald-400 animate-pulse' : 'text-blue-400'}`} />
            <span className="text-xs font-semibold">
              {castHook.isCasting ? 'Transmitindo' : 'Cast TV'}
            </span>
          </button>

          <button
            onClick={onOpenScanner}
            className="p-2.5 rounded-xl glass-button text-slate-300 hover:text-white cursor-pointer"
            title="Escanear outra sala"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={onSwitchMode}
            className="p-2.5 rounded-xl glass-button text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Abrir Modo TV"
          >
            <Tv className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Modo TV</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full flex flex-col gap-4 relative z-10">
        
        {/* DIRECT CAST QUICK BANNER */}
        <div 
          onClick={() => setIsDirectCastOpen(true)}
          className={`
            p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all border
            ${castHook.isCasting 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
              : 'glass-panel-subtle border-white/10 text-slate-300 hover:border-blue-500/40'}
          `}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl glass-button ${castHook.isCasting ? 'text-emerald-400' : 'text-blue-400'}`}>
              <Cast className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {castHook.isCasting ? `Transmitindo: ${castHook.deviceName || 'TV Sem Fio'}` : 'Conexão Direta Sem Navegador'}
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">Opção 2</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {castHook.isCasting ? 'Toque para gerenciar conexão' : 'Toque para conectar via Chromecast, AirPlay ou Smart View'}
              </span>
            </div>
          </div>
          <button className="px-2.5 py-1 rounded-xl text-[11px] font-bold glass-button text-blue-300 shrink-0">
            {castHook.isCasting ? 'Gerenciar' : 'Conectar'}
          </button>
        </div>
        
        {/* CURRENT SLIDE PREVIEW HERO CARD */}
        <LiquidGlassCard className="p-4 flex flex-col gap-4 border-white/15">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-semibold flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Na Tela da TV
            </span>
            <span className="font-mono bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 text-white">
              {state.playlist.length > 0 ? `${state.currentIndex + 1} / ${state.playlist.length}` : 'Vazio'}
            </span>
          </div>

          {/* Media Preview Box */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
            {currentItem ? (
              currentItem.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video 
                    src={currentItem.url} 
                    className="w-full h-full object-contain pointer-events-none" 
                    muted 
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="px-3 py-1 rounded-full bg-purple-500/80 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 shadow-lg">
                      <Film className="w-3.5 h-3.5" /> Vídeo Curto
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
              <div className="flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
                <ImageIcon className="w-10 h-10 stroke-[1.5]" />
                <span className="text-xs">Nenhuma foto ou vídeo na TV</span>
                <button
                  onClick={handleLoadDemoMedia}
                  className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-xl glass-button text-blue-300 border-blue-500/30 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Carregar Demonstração
                </button>
              </div>
            )}
          </div>

          {/* TACTILE PLAYBACK BUTTONS */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={prevSlide}
              disabled={state.playlist.length <= 1}
              className="flex-1 py-3.5 rounded-2xl glass-button flex items-center justify-center text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              disabled={state.playlist.length === 0}
              className={`
                flex-[1.5] py-3.5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-300
                ${state.isPlaying 
                  ? 'bg-gradient-to-r from-blue-600/80 to-indigo-600/80 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] border border-blue-400/40' 
                  : 'glass-button text-slate-200 hover:text-white'}
              `}
            >
              {state.isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pausar</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Iniciar</span>
                </>
              )}
            </button>

            <button
              onClick={nextSlide}
              disabled={state.playlist.length <= 1}
              className="flex-1 py-3.5 rounded-2xl glass-button flex items-center justify-center text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:text-white"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </LiquidGlassCard>

        {/* TIMER CONTROLLER CARD */}
        <LiquidGlassCard className="p-5 flex flex-col gap-4 border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-white tracking-wide">
                Timer Entre Imagens
              </span>
            </div>
            <span className="text-lg font-extrabold font-mono text-blue-400 bg-blue-500/10 px-3 py-0.5 rounded-xl border border-blue-500/20">
              {state.timerSeconds}s
            </span>
          </div>

          {/* Slider */}
          <div className="flex flex-col gap-2">
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              value={state.timerSeconds || 5}
              onChange={(e) => setTimer(Number(e.target.value))}
              className="w-full cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1s (Rápido)</span>
              <span>15s</span>
              <span>30s</span>
              <span>60s (Lento)</span>
            </div>
          </div>

          {/* Quick Preset Chips */}
          <div className="grid grid-cols-6 gap-1.5 pt-1">
            {timerPresets.map((sec) => (
              <button
                key={sec}
                onClick={() => setTimer(sec)}
                className={`
                  py-2 rounded-xl text-xs font-mono font-semibold transition-all
                  ${state.timerSeconds === sec 
                    ? 'bg-gradient-to-b from-blue-500 to-indigo-600 text-white shadow-md border border-blue-400/50 scale-105' 
                    : 'glass-panel-subtle text-slate-400 hover:text-white border-white/5'}
                `}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Display Mode Switcher (Fit vs Fill) */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Enquadramento na TV</span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => updateSettings({ fitMode: 'contain' })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  state.fitMode === 'contain' 
                    ? 'bg-white/20 text-white shadow' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ajustar
              </button>
              <button
                onClick={() => updateSettings({ fitMode: 'cover' })}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
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

        {/* MEDIA UPLOADER & PLAYLIST SECTION */}
        <LiquidGlassCard className="p-5 flex flex-col gap-4 border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-white tracking-wide">
                Fila de Mídias ({state.playlist.length})
              </span>
            </div>
            {state.playlist.length > 0 && (
              <button
                onClick={clearPlaylist}
                className="text-[11px] text-red-400 hover:text-red-300 font-medium px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
              >
                Limpar tudo
              </button>
            )}
          </div>

          {/* Action buttons: Upload File & Demo */}
          <div className="grid grid-cols-2 gap-2.5">
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
              className="py-3 px-4 rounded-2xl glass-button border-blue-500/30 text-blue-300 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-blue-500/10 cursor-pointer shadow-specular"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>Adicionar Fotos/Vídeos</span>
                </>
              )}
            </button>

            <button
              onClick={handleLoadDemoMedia}
              className="py-3 px-4 rounded-2xl glass-button text-purple-300 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-purple-500/10 cursor-pointer shadow-specular"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Adicionar Demo</span>
            </button>
          </div>

          {/* Media Items List */}
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
            {state.playlist.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                Nenhuma mídia adicionada. Toque no botão acima para adicionar fotos ou vídeos do seu celular.
              </div>
            ) : (
              state.playlist.map((item, idx) => {
                const isSelected = state.currentIndex === idx;
                return (
                  <div
                    key={item.id || idx}
                    className={`
                      p-2.5 rounded-2xl flex items-center gap-3 transition-all
                      ${isSelected 
                        ? 'bg-gradient-to-r from-blue-900/30 via-slate-800/50 to-slate-900/60 border border-blue-400/40 shadow-glass-sm' 
                        : 'glass-panel-subtle hover:bg-white/5 border-white/5'}
                    `}
                  >
                    {/* Thumbnail */}
                    <div 
                      onClick={() => setIndex(idx)}
                      className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/60 shrink-0 cursor-pointer border border-white/10"
                    >
                      {item.type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-purple-400">
                          <Film className="w-5 h-5" />
                        </div>
                      ) : (
                        <img 
                          src={item.url} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 ring-2 ring-blue-400 ring-inset" />
                      )}
                    </div>

                    {/* Metadata & Click to select */}
                    <div 
                      onClick={() => setIndex(idx)}
                      className="flex-1 min-w-0 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          item.type === 'video' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {item.type === 'video' ? 'Vídeo' : 'Foto'}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            • Na TV
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                        {item.name || `Item #${idx + 1}`}
                      </p>
                    </div>

                    {/* Order Controls & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveItem(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-20"
                        title="Mover para cima"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(idx, 1)}
                        disabled={idx === state.playlist.length - 1}
                        className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-20"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 ml-1"
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

      {/* DIRECT WIRELESS CAST MODAL */}
      <DirectCastModal
        isOpen={isDirectCastOpen}
        onClose={() => setIsDirectCastOpen(false)}
        castHook={castHook}
        roomId={roomId}
        onOpenQrMode={onOpenScanner}
      />
    </div>
  );
}

import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Image as ImageIcon,
  Film,
  Trash2,
  ChevronUp,
  ChevronDown,
  Plus,
  Sparkles,
  Clock,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import LiquidGlassCard from './LiquidGlassCard';

export default function MobileRemote({
  socketHook,
  roomId,
}) {
  const {
    state,
    isConnected,
    updatePlaylist,
    setIndex,
    nextSlide,
    prevSlide,
    togglePlay,
    setTimer,
    updateSettings
  } = socketHook;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const currentItem = state.playlist[state.currentIndex] || null;

  // ── Upload via Cloudflare Pages Function /api/upload ──────────────────────
  // Envia para ImgBB (imagens) ou Catbox (vídeos) via serverless function.
  // Fallback: comprime no browser e usa base64 se a function falhar.
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    setUploadError('');

    try {
      let mediaItems = [];

      // 1. Tenta via Cloudflare Pages Function (imagem vai para ImgBB/Catbox)
      try {
        const formData = new FormData();
        files.forEach((f) => formData.append('files', f));

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.success && Array.isArray(data.items) && data.items.length > 0) {
            mediaItems = data.items;
          }
        }
      } catch (apiErr) {
        console.warn('Cloudflare /api/upload falhou, usando fallback local:', apiErr);
      }

      // 2. Fallback: processa localmente com compressão canvas
      if (mediaItems.length === 0) {
        mediaItems = await Promise.all(files.map(compressLocally));
      }

      if (mediaItems.length > 0) {
        updatePlaylist([...state.playlist, ...mediaItems]);
      }
    } catch (err) {
      console.error('Falha ao carregar mídias:', err);
      setUploadError('Erro ao carregar. Tente novamente.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Compressão local via canvas para fallback sem servidor
  const compressLocally = (file) => {
    return new Promise((resolve) => {
      const isVid = (file.type || '').startsWith('video/');
      const makeId = () => 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

      if (isVid) {
        const reader = new FileReader();
        reader.onload = (ev) => resolve({ id: makeId(), type: 'video', name: file.name, url: ev.target.result, duration: 0 });
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1920;
          let w = img.width, h = img.height;
          if (w > MAX || h > MAX) {
            if (w > h) { h = Math.round((h * MAX) / w); w = MAX; }
            else { w = Math.round((w * MAX) / h); h = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve({ id: makeId(), type: 'image', name: file.name, url: canvas.toDataURL('image/jpeg', 0.82), duration: 5 });
        };
        img.onerror = () => resolve({ id: makeId(), type: 'image', name: file.name, url: ev.target.result, duration: 5 });
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Demo rápida com fotos/vídeo online
  const handleLoadDemo = () => {
    const demo = [
      { id: 'demo-1', type: 'image', name: 'Nebulosa Cósmica', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80', duration: 5 },
      { id: 'demo-2', type: 'image', name: 'Montanhas Glaciais', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80', duration: 5 },
      { id: 'demo-3', type: 'video', name: 'Vídeo Demo (Blazes)', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', duration: 0 },
      { id: 'demo-4', type: 'image', name: 'Cyberpunk City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80', duration: 5 }
    ];
    updatePlaylist([...state.playlist, ...demo]);
  };

  const moveItem = (index, dir) => {
    const ni = index + dir;
    if (ni < 0 || ni >= state.playlist.length) return;
    const items = [...state.playlist];
    const [moved] = items.splice(index, 1);
    items.splice(ni, 0, moved);
    updatePlaylist(items);
  };

  const removeItem = (index) => updatePlaylist(state.playlist.filter((_, i) => i !== index));

  const clearPlaylist = () => {
    if (window.confirm('Limpar todas as mídias da TV?')) updatePlaylist([]);
  };

  const TIMER_PRESETS = [3, 5, 10, 30];

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col pb-20 relative select-none">
      {/* Background mesh */}
      <div className="absolute inset-0 bg-ambient-mesh opacity-70 pointer-events-none" />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 px-4 pt-safe pt-3 pb-2.5 glass-panel-subtle border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl glass-button flex items-center justify-center shrink-0 border-slate-300/40">
            <Smartphone className="w-4 h-4 text-slate-200" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-display font-black text-white tracking-tight">ASPERUS</span>
            <span className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/15 text-slate-200 border border-slate-300/35 whitespace-nowrap">
              {roomId ? `SALA ${roomId}` : 'SEM SALA'}
            </span>
          </div>
        </div>

        {/* Indicador de conexão */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-slate-200' : 'bg-slate-500'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-white' : 'bg-slate-500'}`} />
          </span>
          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
            {isConnected ? 'Conectado' : 'Offline'}
          </span>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-3.5 py-4 max-w-md mx-auto w-full flex flex-col gap-3.5 relative z-10 font-sans">

        {/* ── PREVIEW + CONTROLES ─────────────────────────────────────────── */}
        <LiquidGlassCard className="p-3.5 flex flex-col gap-3 border-slate-300/20 shadow-2xl">
          {/* Contador */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase tracking-wider font-display font-bold text-[11px] text-slate-200 whitespace-nowrap">
              Na Tela da TV
            </span>
            <span className="font-mono text-[11px] bg-white/10 px-2 py-0.5 rounded-md border border-white/15 text-white whitespace-nowrap">
              {state.playlist.length > 0 ? `${state.currentIndex + 1} / ${state.playlist.length}` : 'Vazio'}
            </span>
          </div>

          {/* Preview Box */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/70 border border-slate-300/20 flex items-center justify-center">
            {currentItem ? (
              currentItem.type === 'video' ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video src={currentItem.url} className="w-full h-full object-contain pointer-events-none" muted />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-300/40 backdrop-blur-md text-[11px] font-mono font-bold text-slate-100 flex items-center gap-1.5">
                      <Film className="w-3 h-3 text-slate-200" /> Vídeo
                    </span>
                  </div>
                </div>
              ) : (
                <img src={currentItem.url} alt={currentItem.name} className="w-full h-full object-contain" />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                <span className="text-xs">Nenhuma mídia na TV</span>
                <button
                  onClick={handleLoadDemo}
                  className="mt-1 text-xs font-display font-bold px-3 py-1.5 rounded-xl glass-button text-slate-200 border-slate-300/40 flex items-center gap-1.5 shadow-chrome"
                >
                  <Sparkles className="w-3 h-3 text-slate-300" />
                  Ver Demonstração
                </button>
              </div>
            )}
          </div>

          {/* Controles de reprodução */}
          <div className="flex items-center justify-between gap-2.5">
            <button
              onClick={prevSlide}
              disabled={state.playlist.length <= 1}
              className="flex-1 py-3 rounded-xl glass-button flex items-center justify-center text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white active:scale-95 cursor-pointer"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => togglePlay()}
              disabled={state.playlist.length === 0}
              className={`flex-[1.8] py-3 rounded-xl flex items-center justify-center gap-2 font-display font-black text-xs tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 cursor-pointer transition-all ${
                state.isPlaying
                  ? 'bg-gradient-to-r from-white via-slate-200 to-slate-400 text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.4)] border border-white'
                  : 'glass-button text-slate-100 hover:text-white border-slate-300/40'
              }`}
            >
              {state.isPlaying ? (
                <><Pause className="w-4 h-4 fill-current" /><span>Pausar</span></>
              ) : (
                <><Play className="w-4 h-4 fill-current" /><span>Passar</span></>
              )}
            </button>

            <button
              onClick={nextSlide}
              disabled={state.playlist.length <= 1}
              className="flex-1 py-3 rounded-xl glass-button flex items-center justify-center text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white active:scale-95 cursor-pointer border-slate-300/30"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </LiquidGlassCard>

        {/* ── TIMER ───────────────────────────────────────────────────────── */}
        <LiquidGlassCard className="p-3.5 flex flex-col gap-2.5 border-slate-300/20 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-300 shrink-0" />
              <span className="text-xs font-display font-bold text-white tracking-wide whitespace-nowrap">
                Tempo entre Fotos
              </span>
            </div>
            <span className="text-sm font-bold font-mono text-slate-100 bg-slate-200/15 px-2.5 py-0.5 rounded-lg border border-slate-300/35 whitespace-nowrap">
              {state.timerSeconds}s
            </span>
          </div>

          {/* Chips de timer */}
          <div className="grid grid-cols-4 gap-2">
            {TIMER_PRESETS.map((sec) => (
              <button
                key={sec}
                onClick={() => setTimer(sec)}
                className={`py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                  state.timerSeconds === sec
                    ? 'bg-gradient-to-r from-white to-slate-200 text-slate-950 shadow-chrome border border-white'
                    : 'glass-panel-subtle text-slate-300 hover:text-white border-white/10'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Enquadramento */}
          <div className="pt-2 border-t border-slate-300/15 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Enquadramento na TV</span>
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-slate-300/20">
              {['contain', 'cover'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ fitMode: mode })}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                    state.fitMode === mode
                      ? 'bg-white/20 text-white shadow border border-white/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'contain' ? 'Ajustar' : 'Preencher'}
                </button>
              ))}
            </div>
          </div>
        </LiquidGlassCard>

        {/* ── FILA DE MÍDIAS ──────────────────────────────────────────────── */}
        <LiquidGlassCard className="p-3.5 flex flex-col gap-3 border-slate-300/20 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold text-white tracking-wide whitespace-nowrap">
              Fila de Mídias ({state.playlist.length})
            </span>
            {state.playlist.length > 0 && (
              <button
                onClick={clearPlaylist}
                className="text-[11px] text-red-400 hover:text-red-300 font-medium px-2 py-0.5 rounded hover:bg-red-500/10 transition-colors whitespace-nowrap"
              >
                Limpar tudo
              </button>
            )}
          </div>

          {/* Botão principal de upload */}
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
            className="w-full py-3.5 rounded-xl glass-button border-slate-300/40 text-slate-100 font-display font-black text-sm flex items-center justify-center gap-2 hover:border-white cursor-pointer shadow-chrome active:scale-95 disabled:opacity-50"
          >
            {isUploading ? (
              <><RefreshCw className="w-4 h-4 animate-spin text-slate-200" /><span>Enviando para TV...</span></>
            ) : (
              <><Plus className="w-4 h-4 text-slate-200" /><span>ADICIONAR FOTOS / VÍDEOS</span></>
            )}
          </button>

          {uploadError && (
            <p className="text-[11px] text-red-400 text-center">{uploadError}</p>
          )}

          {/* Lista de itens */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
            {state.playlist.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-slate-400 border border-dashed border-white/10 rounded-xl px-2">
                Toque em <strong>ADICIONAR FOTOS</strong> para selecionar do celular.
              </div>
            ) : (
              state.playlist.map((item, idx) => {
                const isSel = state.currentIndex === idx;
                return (
                  <div
                    key={item.id || idx}
                    className={`p-2 rounded-xl flex items-center gap-2.5 transition-all ${
                      isSel
                        ? 'bg-slate-800/80 border border-slate-300/50 shadow-chrome'
                        : 'glass-panel-subtle hover:bg-white/5 border-slate-400/10'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => setIndex(idx)}
                      className="relative w-11 h-11 rounded-lg overflow-hidden bg-black/60 shrink-0 cursor-pointer border border-slate-300/20"
                    >
                      {item.type === 'video' ? (
                        <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-300">
                          <Film className="w-4 h-4" />
                        </div>
                      ) : (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      )}
                      {isSel && <div className="absolute inset-0 bg-white/15 ring-1 ring-slate-200 ring-inset" />}
                    </div>

                    {/* Meta */}
                    <div onClick={() => setIndex(idx)} className="flex-1 min-w-0 cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          item.type === 'video'
                            ? 'bg-slate-800 text-slate-300 border-slate-400/30'
                            : 'bg-slate-200/20 text-white border-slate-300/35'
                        }`}>
                          {item.type === 'video' ? 'Vídeo' : 'Foto'}
                        </span>
                        {isSel && (
                          <span className="text-[9px] font-mono font-bold text-slate-100 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse" /> Na TV
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-200 truncate mt-0.5">{item.name || `Item #${idx + 1}`}</p>
                    </div>

                    {/* Controles de ordem + remover */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-20">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveItem(idx, 1)} disabled={idx === state.playlist.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-20">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-400 ml-0.5">
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
    </div>
  );
}

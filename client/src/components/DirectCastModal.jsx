import React, { useState } from 'react';
import { 
  Tv, 
  Cast, 
  X, 
  Radio, 
  CheckCircle2, 
  Smartphone, 
  Sparkles, 
  AlertCircle,
  ExternalLink,
  QrCode
} from 'lucide-react';
import LiquidGlassCard from './LiquidGlassCard';

export default function DirectCastModal({ 
  isOpen, 
  onClose, 
  castHook, 
  roomId, 
  onOpenQrMode 
}) {
  const { isSupported, isAvailable, isCasting, deviceName, castError, startCast, stopCast } = castHook;
  const [connecting, setConnecting] = useState(false);

  if (!isOpen) return null;

  const handleTriggerCast = async () => {
    setConnecting(true);
    const result = await startCast();
    setConnecting(false);
    if (result.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <LiquidGlassCard className="max-w-lg w-full p-6 border-white/20 flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl glass-button text-blue-400 shadow-specular">
              <Cast className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Conectar Direto à TV
              </h3>
              <p className="text-xs text-slate-400">
                Sem precisar abrir navegador na TV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STATUS CARD */}
        {isCasting ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-emerald-300">Transmitindo Direto</span>
                <p className="text-[11px] text-slate-300">Conectado a: {deviceName || 'TV Sem Fio'}</p>
              </div>
            </div>
            <button
              onClick={stopCast}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40"
            >
              Desconectar
            </button>
          </div>
        ) : (
          /* PRIMARY BUTTON: NATIVE CAST PICKER */
          <div className="flex flex-col gap-3">
            <button
              onClick={handleTriggerCast}
              disabled={connecting}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(99,102,241,0.4)] border border-white/20 hover:brightness-110 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-98"
            >
              <Cast className="w-5 h-5" />
              <span>
                {connecting ? 'Buscando TVs na Rede...' : 'Detectar e Transmitir para TV'}
              </span>
            </button>

            {castError && (
              <div className="text-xs text-amber-300 bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{castError}</span>
              </div>
            )}
          </div>
        )}

        {/* GUIA DAS 3 OPÇÕES NATIVAS POR MARCA DE TV */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Como funciona em cada modelo de TV:
          </span>

          {/* Android TV & Chromecast */}
          <div className="p-3 rounded-2xl glass-panel-subtle border-white/5 flex items-start gap-3 text-xs">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
              <Tv className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-slate-200">Chromecast, Google TV & Android TV</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Basta tocar no botão roxo acima. A caixa de diálogo do sistema vai abrir com o nome da sua TV para você tocar e conectar na hora.
              </p>
            </div>
          </div>

          {/* Samsung Smart View / LG Screen Share */}
          <div className="p-3 rounded-2xl glass-panel-subtle border-white/5 flex items-start gap-3 text-xs">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-slate-200">Samsung (Smart View) ou LG (Screen Share)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Deslize o topo da tela do seu celular para baixo e toque em <strong>Smart View</strong> ou <strong>Transmitir Tela</strong>. A TV espelha instantaneamente sem abrir nada.
              </p>
            </div>
          </div>

          {/* iPhone / AirPlay */}
          <div className="p-3 rounded-2xl glass-panel-subtle border-white/5 flex items-start gap-3 text-xs">
            <div className="p-2 rounded-xl bg-slate-500/10 text-slate-300 shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="font-bold text-slate-200">iPhone / iPad (AirPlay 2)</span>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Abra a Central de Controle do iPhone, toque no ícone de <strong>Dois Retângulos (Espelhar a Tela)</strong> e escolha sua TV Samsung, LG ou Apple TV.
              </p>
            </div>
          </div>
        </div>

        {/* FALLBACK TO QR CODE BROWSER MODE */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-400">Prefere abrir pela TV?</span>
          <button
            onClick={() => {
              onClose();
              if (onOpenQrMode) onOpenQrMode();
            }}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Usar QR Code na TV</span>
          </button>
        </div>

      </LiquidGlassCard>
    </div>
  );
}

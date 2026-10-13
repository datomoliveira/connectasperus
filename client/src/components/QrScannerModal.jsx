import React, { useState } from 'react';
import { X, QrCode, ArrowRight, Camera, KeyRound } from 'lucide-react';
import LiquidGlassCard from './LiquidGlassCard';

export default function QrScannerModal({ isOpen, onClose, onJoinRoom }) {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Digite o código da sala exibido na TV.');
      return;
    }
    onJoinRoom(cleanCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <LiquidGlassCard className="max-w-md w-full p-6 border-white/20">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl glass-button text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Conectar à TV</h3>
              <p className="text-xs text-slate-400">Digite o código ou aponte a câmera</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white glass-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="pt-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Código da Sala (4 letras/dígitos)
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={8}
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="EX: ASPR"
                className="w-full bg-black/50 border border-white/20 rounded-2xl py-3.5 px-4 text-xl font-mono font-bold tracking-widest text-center text-white focus:outline-none focus:border-blue-500 shadow-inner"
                autoFocus
              />
              <KeyRound className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          </div>

          <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 text-xs text-slate-400 flex items-start gap-3">
            <Camera className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>Dica Rápida:</strong> Se preferir, você pode simplesmente abrir a câmera padrão do seu iPhone ou Android e apontar para o QR Code na TV. Ele abrirá o controle instantaneamente!
            </span>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm tracking-wide shadow-lg border border-blue-400/40 hover:brightness-110 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Conectar Agora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </LiquidGlassCard>
    </div>
  );
}

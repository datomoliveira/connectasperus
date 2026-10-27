import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';
import LiquidGlassCard from './LiquidGlassCard';

export default function CameraScannerModal({ isOpen, onClose, onScanned }) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef(null);
  const scannerContainerId = 'qr-camera-reader-viewport';

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode = null;

    const startScanner = async () => {
      try {
        setIsScanning(true);
        setErrorMessage('');
        
        html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' }, // Back camera on mobile phones
          config,
          (decodedText) => {
            // Success callback when QR Code is detected by the camera!
            console.log('✅ QR Code lido pela câmera:', decodedText);
            
            // Extract room code if it's a full URL or plain code
            let extractedRoom = decodedText;
            try {
              if (decodedText.includes('room=')) {
                const url = new URL(decodedText);
                extractedRoom = url.searchParams.get('room') || decodedText;
              }
            } catch (e) {
              // Not a full URL, use as is
            }

            // Haptic vibration feedback on mobile
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }

            // Stop camera and trigger callback
            if (html5QrCode && html5QrCode.isScanning) {
              html5QrCode.stop().then(() => {
                onScanned(extractedRoom.trim().toUpperCase());
                onClose();
              }).catch(() => {
                onScanned(extractedRoom.trim().toUpperCase());
                onClose();
              });
            } else {
              onScanned(extractedRoom.trim().toUpperCase());
              onClose();
            }
          },
          (error) => {
            // Scan frame did not contain QR code, normal background tick
          }
        );
      } catch (err) {
        console.warn('Erro ao abrir câmera:', err);
        setErrorMessage('Não foi possível acessar a câmera. Verifique a permissão do navegador ou digite o código abaixo.');
        setIsScanning(false);
      }
    };

    // Small delay to ensure DOM container is mounted
    const timer = setTimeout(startScanner, 200);

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {}).finally(() => {
          html5QrCode.clear();
        });
      }
    };
  }, [isOpen, onClose, onScanned]);

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanned(manualCode.trim().toUpperCase());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <LiquidGlassCard className="max-w-sm w-full p-5 border-white/20 flex flex-col gap-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl glass-button text-blue-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Escanear QR Code da TV
              </h3>
              <p className="text-[11px] text-slate-400">
                Aponte a câmera para a tela da TV
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

        {/* Live Camera Viewfinder Box */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black border border-white/20 flex items-center justify-center">
          <div id={scannerContainerId} className="w-full h-full" />

          {/* Scanner Overlay Guide Target */}
          {isScanning && !errorMessage && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border border-slate-300/60 rounded-2xl relative shadow-[0_0_24px_rgba(255,255,255,0.15)]">
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[1px] bg-slate-300/40 animate-pulse" />
              </div>
            </div>
          )}

          {/* Error / Loading State */}
          {errorMessage && (
            <div className="absolute inset-0 bg-black/80 p-4 flex flex-col items-center justify-center text-center gap-2 text-xs text-amber-300">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Manual Code Fallback */}
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-2 pt-1 border-t border-white/10">
          <span className="text-[11px] text-slate-400 font-medium text-center">
            Ou digite o código de 4 letras exibido na TV:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={8}
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="EX: ASPR"
              className="flex-1 bg-black/60 border border-white/20 rounded-xl py-2.5 px-3 text-center font-mono font-bold tracking-widest text-white text-sm focus:outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
            >
              <span>Entrar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

      </LiquidGlassCard>
    </div>
  );
}

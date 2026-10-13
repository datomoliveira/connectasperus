import { useState, useEffect, useRef, useCallback } from 'react';

export function useCast(roomId) {
  const [isSupported, setIsSupported] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false); // Wireless TVs found nearby
  const [isCasting, setIsCasting] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [castError, setCastError] = useState(null);

  const presentationRequestRef = useRef(null);
  const connectionRef = useRef(null);

  // Initialize Presentation API
  useEffect(() => {
    if (!roomId) return;

    const presentationUrl = `${window.location.origin}/?role=tv&room=${roomId}`;
    
    // Check W3C Web Presentation API (Chrome, Edge, Samsung Internet, Android)
    if (typeof window !== 'undefined' && 'PresentationRequest' in window) {
      setIsSupported(true);
      try {
        const request = new window.PresentationRequest([presentationUrl]);
        presentationRequestRef.current = request;

        // Check if there are wireless displays (Chromecast, Miracast, Android TV, etc.) available
        request.getAvailability()
          .then((availability) => {
            setIsAvailable(availability.value);
            availability.onchange = () => {
              setIsAvailable(availability.value);
            };
          })
          .catch((err) => {
            // Some platforms block getAvailability without active user gesture, fallback to true
            console.log('Presentation availability info:', err);
            setIsAvailable(true);
          });

        // Listen for default request connection if initiated by browser UI
        if (navigator.presentation?.defaultRequest) {
          navigator.presentation.defaultRequest = request;
        }
      } catch (err) {
        console.warn('Falha ao inicializar PresentationRequest:', err);
      }
    } else {
      // Check iOS AirPlay or alternative
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsSupported(isIOS || false);
    }
  }, [roomId]);

  // Start casting to wireless TV
  const startCast = useCallback(async () => {
    setCastError(null);
    const presentationUrl = `${window.location.origin}/?role=tv&room=${roomId}`;

    // Path 1: Web Presentation API (Android, Chrome, Samsung Internet, PC)
    if (window.PresentationRequest) {
      try {
        const request = presentationRequestRef.current || new window.PresentationRequest([presentationUrl]);
        presentationRequestRef.current = request;

        // Triggers the native OS / Browser TV picker dialog!
        const connection = await request.start();
        connectionRef.current = connection;
        setIsCasting(true);
        setDeviceName('TV Sem Fio');

        connection.onconnect = () => {
          setIsCasting(true);
        };

        connection.onclose = () => {
          setIsCasting(false);
          setDeviceName('');
        };

        connection.onterminate = () => {
          setIsCasting(false);
          setDeviceName('');
        };

        return { success: true, method: 'presentation' };
      } catch (err) {
        if (err.name === 'NotFoundError' || err.name === 'AbortError') {
          // User cancelled the TV selection dialog
          return { success: false, cancelled: true };
        }
        console.error('Erro ao conectar via Presentation API:', err);
        setCastError('Nenhuma TV compatível selecionada ou suporte não ativo.');
        return { success: false, error: err.message };
      }
    }

    // Path 2: Google Cast SDK Framework
    if (window.cast?.framework?.CastContext) {
      try {
        const context = window.cast.framework.CastContext.getInstance();
        await context.requestSession();
        setIsCasting(true);
        setDeviceName('Chromecast');
        return { success: true, method: 'google-cast' };
      } catch (err) {
        console.error('Erro Google Cast:', err);
      }
    }

    return { 
      success: false, 
      notSupported: true,
      message: 'Navegador atual não possui API de transmissão sem fio nativa aberta.' 
    };
  }, [roomId]);

  // Stop casting
  const stopCast = useCallback(() => {
    if (connectionRef.current) {
      try {
        connectionRef.current.terminate();
      } catch (e) {
        console.error(e);
      }
      connectionRef.current = null;
    }
    setIsCasting(false);
    setDeviceName('');
  }, []);

  return {
    isSupported,
    isAvailable,
    isCasting,
    deviceName,
    castError,
    startCast,
    stopCast
  };
}

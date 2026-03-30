
import React, { useRef, useEffect, useState } from 'react';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';

interface ScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flash, setFlash] = useState<'success' | 'error' | null>(null);
  const isMounted = useRef(true);

  // Audio Context for Beeps
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playBeep = (type: 'success' | 'error') => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3 note
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      console.warn("Audio feedback error:", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    let stream: MediaStream | null = null;
    let animationFrame: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', 
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
          }
        });
        if (videoRef.current && isMounted.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        if (isMounted.current) {
          setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
        }
      }
    };

    const detectBarcode = async () => {
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'qr_code', 'upc_a']
        });

        const checkFrame = async () => {
          if (!isMounted.current) return;

          const video = videoRef.current;
          // Robust check for valid video state
          if (
            video && 
            video.readyState >= 2 && // HAVE_CURRENT_DATA or higher
            video.videoWidth > 0 && 
            video.videoHeight > 0 && 
            !isProcessing
          ) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes.length > 0 && isMounted.current && !isProcessing) {
                const code = barcodes[0].rawValue;
                handleDetectedCode(code);
              }
            } catch (e: any) {
              // Ignore common "Invalid element or state" errors that happen during transitions
              if (e.name !== 'InvalidStateError' && e.name !== 'NotReadableError') {
                console.error("Barcode detection error:", e);
              }
            }
          }
          
          if (isMounted.current) {
            animationFrame = requestAnimationFrame(checkFrame);
          }
        };
        
        // Slight delay to allow video metadata to load
        setTimeout(() => {
          if (isMounted.current) {
            animationFrame = requestAnimationFrame(checkFrame);
          }
        }, 500);
      }
    };

    startCamera();
    detectBarcode();

    return () => {
      isMounted.current = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [isProcessing]);

  const handleDetectedCode = (code: string) => {
    setIsProcessing(true);
    const product = db.getProductByBarcode(code);

    if (product) {
      playBeep('success');
      setFlash('success');
      setTimeout(() => {
        if (isMounted.current) {
          onScan(code);
          setIsProcessing(false);
        }
      }, 500);
    } else {
      playBeep('error');
      setFlash('error');
      setTimeout(() => {
        if (isMounted.current) {
          onScan(code); // Let parent handle unknown barcode modal
          setIsProcessing(false);
        }
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Visual Feedback Flash */}
      {flash && (
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
          flash === 'success' ? 'bg-emerald-500/20 border-[12px] border-emerald-500' : 'bg-rose-500/20 border-[12px] border-rose-500'
        }`} />
      )}

      <div className="flex items-center justify-between p-4 text-white z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            <RefreshCw size={16} className="animate-spin text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold">Scan Automatique</h3>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full active:scale-90 transition-transform">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-slate-900">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center text-white">
            <AlertTriangle size={48} className="text-amber-500 mb-4" />
            <p className="font-medium">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-6 bg-white/10 px-6 py-3 rounded-2xl font-bold">Réessayer</button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-72 h-48 border-2 border-emerald-400/50 rounded-3xl relative">
                {/* Corners */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                
                {/* Scanning Line */}
                <div className="absolute left-4 right-4 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-[scanLine_2s_ease-in-out_infinite]" />
              </div>
            </div>
            
            {/* Fallback Simulation Button for non-supported browsers */}
            { !('BarcodeDetector' in window) && (
              <div className="absolute bottom-12 left-0 right-0 flex justify-center px-8 z-20">
                <button 
                  onClick={() => {
                    if (!isProcessing) {
                      const codes = ['123456', '999999']; // Known and Unknown
                      handleDetectedCode(codes[Math.floor(Math.random() * codes.length)]);
                    }
                  }}
                  className="bg-white/10 backdrop-blur-md text-white font-bold py-4 px-8 rounded-2xl border border-white/20 flex items-center gap-3 active:scale-95 transition-all"
                >
                  <RefreshCw size={20} />
                  SIMULER SCAN (Demo)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-black/90 text-white p-6 pb-12 text-center z-20">
        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">Analyse Active</p>
        <p className="text-xs mt-1 opacity-60">Cadrez le code pour un bip de confirmation</p>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0.2; }
          50% { top: 90%; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

import type { TrackingFrame } from '../types/hand';
import { recognizeGesture } from '../core/gestureRecognizer';
import { useEffect, useRef, useState } from 'react';

interface CalibrationOverlayProps {
  frame: TrackingFrame | null;
  onReady: () => void;
}

export default function CalibrationOverlay({ frame, onReady }: CalibrationOverlayProps) {
  const [palmDuration, setPalmDuration] = useState(0);
  const palmStartRef = useRef<number | null>(null);
  const REQUIRED_DURATION = 1000;

  useEffect(() => {
    if (!frame || frame.hands.length === 0) {
      palmStartRef.current = null;
      setPalmDuration(0);
      return;
    }

    const gesture = recognizeGesture(frame.hands[0]);

    if (gesture === 'open_palm') {
      if (!palmStartRef.current) {
        palmStartRef.current = Date.now();
      }
      const elapsed = Date.now() - palmStartRef.current;
      setPalmDuration(elapsed);
      if (elapsed >= REQUIRED_DURATION) {
        onReady();
      }
    } else {
      palmStartRef.current = null;
      setPalmDuration(0);
    }
  }, [frame, onReady]);

  const progress = Math.min(palmDuration / REQUIRED_DURATION, 1);
  const hasHand = frame && frame.hands.length > 0;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20">
      <div className="bg-gray-900/90 backdrop-blur-md rounded-2xl px-8 py-6 text-center max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-white">Position Your Camera</h2>

        <div className="text-left space-y-2 text-sm text-blue-200">
          <p>1. Point your camera at your <span className="text-white font-bold">lap or desk area</span></p>
          <p>2. The drum kit will appear on screen over your lap</p>
          <p>3. Use your <span className="text-white font-bold">index fingers</span> to strike the drums</p>
        </div>

        <div className="border-t border-gray-700 pt-4">
          {!hasHand ? (
            <p className="text-yellow-300 font-semibold">
              Show your hand to the camera to continue
            </p>
          ) : (
            <p className="text-green-300 font-semibold">
              Hold an open palm to start playing...
            </p>
          )}
        </div>

        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-100 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="text-xs text-gray-500">
          Open your palm for 1 second to begin
        </p>
      </div>
    </div>
  );
}

import { useRef, useState, useCallback, useEffect } from 'react';
import { HandTracker } from '../core/handTracker';
import type { TrackingFrame } from '../types/hand';
import { TRACKING_CONFIG } from '../config/tracking';

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const trackerRef = useRef<HandTracker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [frame, setFrame] = useState<TrackingFrame | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const runningRef = useRef(false);

  const frameInterval = 1000 / TRACKING_CONFIG.targetFps;

  const init = useCallback(async () => {
    setIsLoading(true);
    try {
      const tracker = new HandTracker();
      await tracker.init();
      trackerRef.current = tracker;
      setIsReady(true);
    } catch (err) {
      console.error('HandTracker init failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startLoop = useCallback(() => {
    runningRef.current = true;

    const loop = (timestamp: number) => {
      if (!runningRef.current) return;

      if (timestamp - lastTimeRef.current >= frameInterval) {
        lastTimeRef.current = timestamp;
        const video = videoRef.current;
        if (video && video.readyState >= 2 && trackerRef.current) {
          const result = trackerRef.current.detect(video, timestamp);
          if (result) {
            setFrame(result);
          }
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [videoRef, frameInterval]);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => {
    return () => {
      runningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      trackerRef.current?.destroy();
    };
  }, []);

  return { frame, isLoading, isReady, init, startLoop, stopLoop };
}

import { useRef, useCallback, useEffect, useState } from 'react';
import { HitDetector } from '../core/hitDetector';
import type { AudioEngine } from '../core/audioEngine';
import type { TrackingFrame } from '../types/hand';
import type { PadConfig } from '../types/instrument';
import type { RippleState } from '../utils/canvas';

export function useHitDetection(
  audioEngineRef: React.RefObject<AudioEngine | null>,
  pads: PadConfig[],
) {
  const detectorRef = useRef(new HitDetector());
  const [activePads, setActivePads] = useState<Set<string>>(new Set());
  const [ripples, setRipples] = useState<RippleState[]>([]);
  const activeTimers = useRef<Map<string, number>>(new Map());

  const processFrame = useCallback(
    (frame: TrackingFrame) => {
      const hits = detectorRef.current.update(frame, pads);

      for (const hit of hits) {
        audioEngineRef.current?.play(hit.padId);

        const pad = pads.find((p) => p.id === hit.padId);
        if (pad) {
          setActivePads((prev) => new Set(prev).add(hit.padId));
          setRipples((prev) => [
            ...prev,
            {
              cx: pad.region.cx,
              cy: pad.region.cy,
              color: pad.color,
              startTime: performance.now(),
              duration: 400,
            },
          ]);

          const existing = activeTimers.current.get(hit.padId);
          if (existing) clearTimeout(existing);

          const timer = window.setTimeout(() => {
            setActivePads((prev) => {
              const next = new Set(prev);
              next.delete(hit.padId);
              return next;
            });
          }, 150);
          activeTimers.current.set(hit.padId, timer);
        }
      }
    },
    [audioEngineRef, pads],
  );

  useEffect(() => {
    return () => {
      activeTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return { processFrame, activePads, ripples, setRipples };
}

import { useRef, useState, useCallback } from 'react';
import { AudioEngine } from '../core/audioEngine';
import type { PadConfig } from '../types/instrument';

export function useAudio() {
  const engineRef = useRef<AudioEngine | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const init = useCallback(async (pads: PadConfig[]) => {
    const engine = new AudioEngine();
    await engine.init();

    await Promise.all(pads.map((pad) => engine.loadSample(pad.id, pad.soundFile)));

    engineRef.current = engine;
    setIsLoaded(true);
  }, []);

  const loadCustomSample = useCallback(async (padId: string, file: File) => {
    if (!engineRef.current) return;
    const arrayBuffer = await file.arrayBuffer();
    await engineRef.current.loadSampleFromBuffer(padId, arrayBuffer);
  }, []);

  const resume = useCallback(async () => {
    await engineRef.current?.resume();
  }, []);

  return { engine: engineRef.current, isLoaded, init, loadCustomSample, resume };
}

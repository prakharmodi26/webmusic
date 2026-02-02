import type { PadConfig } from '../types/instrument';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  beginnerMode: boolean;
  onBeginnerModeChange: (value: boolean) => void;
  pads: PadConfig[];
  onCustomSample: (padId: string, file: File) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  beginnerMode,
  onBeginnerModeChange,
  pads,
  onCustomSample,
}: SettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-900/95 backdrop-blur-md z-40 p-6 overflow-y-auto shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-2xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={beginnerMode}
              onChange={(e) => onBeginnerModeChange(e.target.checked)}
              className="w-5 h-5 accent-pink-500 rounded"
            />
            <span className="text-sm font-semibold text-gray-300">
              Beginner Mode (larger pads)
            </span>
          </label>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Custom Samples
          </h3>
          <div className="space-y-3">
            {pads.map((pad) => (
              <div key={pad.id} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: pad.color }}
                />
                <span className="text-sm text-gray-400 w-20">{pad.label}</span>
                <label className="flex-1 cursor-pointer">
                  <span className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-gray-300 transition-colors">
                    Upload .wav
                  </span>
                  <input
                    type="file"
                    accept=".wav,audio/wav"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onCustomSample(pad.id, file);
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

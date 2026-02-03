import type { PadConfig } from '../types/instrument';
import type { InstrumentType } from './InstrumentHome';
import { tablaSounds } from '../config/instruments/tabla';
import { customPadColors } from '../config/instruments/custom';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  beginnerMode: boolean;
  onBeginnerModeChange: (value: boolean) => void;
  pads: PadConfig[];
  onCustomSample: (padId: string, file: File) => void;
  instrumentType: InstrumentType;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
  // Tabla-specific
  onTablaSoundChange?: (padId: string, soundFile: string) => void;
  // Custom-specific
  onDeletePad?: (padId: string) => void;
  onPadColorChange?: (padId: string, color: string) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  beginnerMode,
  onBeginnerModeChange,
  pads,
  onCustomSample,
  instrumentType,
  sensitivity,
  onSensitivityChange,
  onTablaSoundChange,
  onDeletePad,
  onPadColorChange,
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
        {/* Beginner Mode Toggle */}
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

        {/* Sensitivity Slider */}
        {(instrumentType === 'drums' || instrumentType === 'tabla' || instrumentType === 'custom') && (
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Hit Sensitivity
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Less</span>
              <input
                type="range"
                min="0.3"
                max="0.9"
                step="0.05"
                value={sensitivity}
                onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
                className="flex-1 accent-pink-500"
              />
              <span className="text-xs text-gray-500">More</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {Math.round(sensitivity * 100)}%
            </p>
          </div>
        )}

        {/* Tabla Sound Selector */}
        {instrumentType === 'tabla' && onTablaSoundChange && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Tabla Sounds
            </h3>
            <div className="space-y-3">
              {pads.map((pad) => (
                <div key={pad.id} className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: pad.color }}
                  />
                  <span className="text-sm text-gray-400 w-16">{pad.label}</span>
                  <select
                    className="flex-1 bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 border border-gray-700"
                    value={pad.soundFile}
                    onChange={(e) => onTablaSoundChange(pad.id, e.target.value)}
                  >
                    {tablaSounds.map((sound) => (
                      <option key={sound.id} value={sound.file}>
                        {sound.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Samples */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            {instrumentType === 'custom' ? 'Pad Sounds' : 'Custom Samples'}
          </h3>
          {pads.length === 0 ? (
            <p className="text-sm text-gray-500">No pads added yet</p>
          ) : (
            <div className="space-y-3">
              {pads.map((pad) => (
                <div key={pad.id} className="space-y-2">
                  <div className="flex items-center gap-3">
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
                    {/* Delete button for custom mode */}
                    {instrumentType === 'custom' && onDeletePad && (
                      <button
                        onClick={() => onDeletePad(pad.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-2"
                        title="Delete pad"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Color picker for custom mode */}
                  {instrumentType === 'custom' && onPadColorChange && (
                    <div className="flex gap-1 ml-6">
                      {customPadColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => onPadColorChange(pad.id, color)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                            pad.color === color ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

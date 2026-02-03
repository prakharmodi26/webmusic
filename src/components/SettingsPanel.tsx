import type { PadConfig } from '../types/instrument';
import type { InstrumentType } from './InstrumentHome';
import { tablaSounds } from '../config/instruments/tabla';
import { customPadColors } from '../config/instruments/custom';

// All available preset sounds organized by category
export const presetSounds = {
  drums: [
    { id: 'crash', label: 'Crash', file: '/sounds/drums/crash.wav' },
    { id: 'ride', label: 'Ride', file: '/sounds/drums/ride.wav' },
    { id: 'snare', label: 'Snare', file: '/sounds/drums/snare.wav' },
    { id: 'hihat', label: 'Hi-Hat', file: '/sounds/drums/hihat.wav' },
    { id: 'tom-high', label: 'Tom High', file: '/sounds/drums/tom-high.wav' },
    { id: 'tom-low', label: 'Tom Low', file: '/sounds/drums/tom-low.wav' },
  ],
  tabla: [
    { id: 'na', label: 'Na', file: '/sounds/tabla/Tabla/na.wav' },
    { id: 'tay', label: 'Tay', file: '/sounds/tabla/Tabla/tay.wav' },
    { id: 'tey', label: 'Tey', file: '/sounds/tabla/Tabla/tey.wav' },
    { id: 'ti', label: 'Ti', file: '/sounds/tabla/Tabla/ti.wav' },
    { id: 'ti-ri', label: 'Ti-Ri', file: '/sounds/tabla/Tabla/ti-ri.wav' },
    { id: 'tun', label: 'Tun', file: '/sounds/tabla/Tabla/tun.wav' },
    { id: 'dhi', label: 'Dhi', file: '/sounds/tabla/Tabla/dhi.wav' },
    { id: 'dhin', label: 'Dhin', file: '/sounds/tabla/Tabla/dhin-noslide.wav' },
    { id: 'dhin-slide', label: 'Dhin (Slide)', file: '/sounds/tabla/Tabla/dhin-slide.wav' },
    { id: 'dha', label: 'Dha', file: '/sounds/tabla/Tabla/dha-noslide.wav' },
    { id: 'dha-slide', label: 'Dha (Slide)', file: '/sounds/tabla/Tabla/dha-slide.wav' },
    { id: 'ghay', label: 'Ghay', file: '/sounds/tabla/Tabla/ghay.wav' },
    { id: 'gi', label: 'Gi', file: '/sounds/tabla/Tabla/gi.wav' },
    { id: 'kut', label: 'Kut', file: '/sounds/tabla/Tabla/kut.wav' },
    { id: 'tabla1', label: 'Tabla 1', file: '/sounds/tabla/Tabla/tabla1.wav' },
    { id: 'tabla2', label: 'Tabla 2', file: '/sounds/tabla/Tabla/tabla2.wav' },
    { id: 'tabla3', label: 'Tabla 3', file: '/sounds/tabla/Tabla/tabla3.wav' },
    { id: 'tabla4', label: 'Tabla 4', file: '/sounds/tabla/Tabla/tabla4.wav' },
    { id: 'tabla5', label: 'Tabla 5', file: '/sounds/tabla/Tabla/tabla5.wav' },
    { id: 'tabla6', label: 'Tabla 6', file: '/sounds/tabla/Tabla/tabla6.wav' },
  ],
  piano: [
    { id: 'C3', label: 'C3', file: '/sounds/piano/C3.mp3' },
    { id: 'D3', label: 'D3', file: '/sounds/piano/D3.mp3' },
    { id: 'E3', label: 'E3', file: '/sounds/piano/E3.mp3' },
    { id: 'F3', label: 'F3', file: '/sounds/piano/F3.mp3' },
    { id: 'G3', label: 'G3', file: '/sounds/piano/G3.mp3' },
    { id: 'A3', label: 'A3', file: '/sounds/piano/A3.mp3' },
    { id: 'B3', label: 'B3', file: '/sounds/piano/B3.mp3' },
    { id: 'C4', label: 'C4', file: '/sounds/piano/C4.mp3' },
    { id: 'D4', label: 'D4', file: '/sounds/piano/D4.mp3' },
    { id: 'E4', label: 'E4', file: '/sounds/piano/E4.mp3' },
    { id: 'F4', label: 'F4', file: '/sounds/piano/F4.mp3' },
    { id: 'G4', label: 'G4', file: '/sounds/piano/G4.mp3' },
    { id: 'A4', label: 'A4', file: '/sounds/piano/A4.mp3' },
    { id: 'B4', label: 'B4', file: '/sounds/piano/B4.mp3' },
    { id: 'C5', label: 'C5', file: '/sounds/piano/C5.mp3' },
    { id: 'D5', label: 'D5', file: '/sounds/piano/D5.mp3' },
    { id: 'E5', label: 'E5', file: '/sounds/piano/E5.mp3' },
    { id: 'F5', label: 'F5', file: '/sounds/piano/F5.mp3' },
    { id: 'G5', label: 'G5', file: '/sounds/piano/G5.mp3' },
    { id: 'A5', label: 'A5', file: '/sounds/piano/A5.mp3' },
    { id: 'B5', label: 'B5', file: '/sounds/piano/B5.mp3' },
  ],
};

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
  onPadLabelChange?: (padId: string, label: string) => void;
  onPresetSoundChange?: (padId: string, soundFile: string) => void;
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
  onPadLabelChange,
  onPresetSoundChange,
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
                    {instrumentType === 'custom' && onPadLabelChange ? (
                      <input
                        type="text"
                        value={pad.label}
                        onChange={(e) => onPadLabelChange(pad.id, e.target.value)}
                        className="bg-gray-800 text-gray-300 text-sm rounded px-2 py-1 w-16 border border-gray-700 focus:border-pink-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-gray-400 w-16">{pad.label}</span>
                    )}
                    
                    {/* Preset Sound Dropdown for Custom Mode */}
                    {instrumentType === 'custom' && onPresetSoundChange ? (
                      <select
                        className="flex-1 bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700"
                        value={pad.soundFile || ''}
                        onChange={(e) => onPresetSoundChange(pad.id, e.target.value)}
                      >
                        <option value="">-- Select Sound --</option>
                        <optgroup label="🥁 Drums">
                          {presetSounds.drums.map((sound) => (
                            <option key={sound.id} value={sound.file}>
                              {sound.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🪘 Tabla">
                          {presetSounds.tabla.map((sound) => (
                            <option key={sound.id} value={sound.file}>
                              {sound.label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="🎹 Piano">
                          {presetSounds.piano.map((sound) => (
                            <option key={sound.id} value={sound.file}>
                              {sound.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    ) : (
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
                    )}
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

                  {/* Upload custom sound for custom mode */}
                  {instrumentType === 'custom' && (
                    <div className="ml-6">
                      <label className="cursor-pointer">
                        <span className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-gray-300 transition-colors">
                          Or upload .wav/.mp3
                        </span>
                        <input
                          type="file"
                          accept=".wav,.mp3,audio/wav,audio/mpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onCustomSample(pad.id, file);
                          }}
                        />
                      </label>
                    </div>
                  )}

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

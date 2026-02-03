export type InstrumentType = 'drums' | 'tabla' | 'custom';

interface InstrumentHomeProps {
  onSelectInstrument: (instrument: InstrumentType) => void;
  error: string | null;
}

interface InstrumentCard {
  id: InstrumentType;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

const instruments: InstrumentCard[] = [
  {
    id: 'drums',
    name: 'Drums',
    description: 'Classic drum kit with cymbals',
    gradient: 'from-pink-500 to-purple-600',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        {/* Drum body */}
        <ellipse cx="32" cy="40" rx="24" ry="8" fill="#CCCCCC" />
        <rect x="8" y="24" width="48" height="16" fill="#AAAAAA" />
        <ellipse cx="32" cy="24" rx="24" ry="8" fill="#DDDDDD" />
        {/* Cymbal */}
        <ellipse cx="48" cy="12" rx="12" ry="4" fill="#D4A843" />
        <line x1="48" y1="12" x2="48" y2="24" stroke="#666" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: 'tabla',
    name: 'Tabla',
    description: 'Indian classical percussion',
    gradient: 'from-amber-600 to-orange-700',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        {/* Dayan (smaller, right) */}
        <ellipse cx="42" cy="40" rx="14" ry="5" fill="#8B4513" />
        <rect x="28" y="20" width="28" height="20" rx="2" fill="#A0522D" />
        <ellipse cx="42" cy="20" rx="14" ry="5" fill="#8B4513" />
        <circle cx="42" cy="20" r="6" fill="#2F1810" />
        {/* Bayan (larger, left) */}
        <ellipse cx="18" cy="44" rx="16" ry="6" fill="#2F1810" />
        <rect x="2" y="22" width="32" height="22" rx="2" fill="#3D2314" />
        <ellipse cx="18" cy="22" rx="16" ry="6" fill="#2F1810" />
        <circle cx="18" cy="22" r="8" fill="#1a0d08" />
      </svg>
    ),
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Create your own instrument',
    gradient: 'from-cyan-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 64 64" className="w-16 h-16" fill="currentColor">
        {/* Plus sign in circle */}
        <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 4" />
        <rect x="28" y="16" width="8" height="32" rx="2" fill="currentColor" />
        <rect x="16" y="28" width="32" height="8" rx="2" fill="currentColor" />
      </svg>
    ),
  },
];

export default function InstrumentHome({ onSelectInstrument, error }: InstrumentHomeProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="text-center space-y-8 px-4">
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          WebMusic
        </h1>
        <p className="text-lg md:text-xl text-blue-200 max-w-md mx-auto">
          Play instruments with your hands using just your webcam
        </p>

        <div className="flex flex-wrap justify-center gap-6 md:gap-8 mt-8">
          {instruments.map((instrument) => (
            <button
              key={instrument.id}
              onClick={() => onSelectInstrument(instrument.id)}
              className="group flex flex-col items-center gap-3 transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <div
                className={`w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br ${instrument.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:shadow-pink-500/20 transition-all duration-200 border-4 border-white/20`}
              >
                <div className="text-white/90">
                  {instrument.icon}
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-lg">{instrument.name}</p>
                <p className="text-blue-300/70 text-sm max-w-[140px]">{instrument.description}</p>
              </div>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-6 py-3 text-red-200 max-w-sm mx-auto">
            {error}
          </div>
        )}

        <div className="flex justify-center gap-6 text-sm text-blue-300/70 mt-8">
          <span>Webcam required</span>
          <span>Works in Chrome/Edge</span>
          <span>No install needed</span>
        </div>
      </div>
    </div>
  );
}

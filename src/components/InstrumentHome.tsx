import { useState, useEffect } from 'react';

export type InstrumentType = 'drums' | 'tabla' | 'custom' | 'tiles' | 'piano-tiles';

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

// Order: piano-tiles first, then drums, tabla, piano, custom (custom at end)
const instruments: InstrumentCard[] = [
  {
    id: 'piano-tiles',
    name: 'Piano Tiles',
    description: 'Rhythm game with finger gestures',
    gradient: 'from-indigo-500 to-purple-600',
    icon: (
      <img src="/svg/piano.svg" alt="Piano Tiles" className="w-20 h-20 object-contain" />
    ),
  },
  {
    id: 'drums',
    name: 'Drums',
    description: 'Classic drum kit with cymbals',
    gradient: 'from-pink-500 to-purple-600',
    icon: (
      <img src="/svg/drums.svg" alt="Drums" className="w-20 h-20 object-contain" />
      /* Old SVG (commented out):
      <svg viewBox="0 0 64 64" className="w-20 h-20" fill="currentColor">
        <ellipse cx="32" cy="40" rx="24" ry="8" fill="#CCCCCC" />
        <rect x="8" y="24" width="48" height="16" fill="#AAAAAA" />
        <ellipse cx="32" cy="24" rx="24" ry="8" fill="#DDDDDD" />
        <ellipse cx="48" cy="12" rx="12" ry="4" fill="#D4A843" />
        <line x1="48" y1="12" x2="48" y2="24" stroke="#666" strokeWidth="2" />
      </svg>
      */
    ),
  },
  {
    id: 'tabla',
    name: 'Tabla',
    description: 'Indian classical percussion',
    gradient: 'from-amber-600 to-orange-700',
    icon: (
      <img src="/svg/tabla.svg" alt="Tabla" className="w-20 h-20 object-contain" />
      /* Old SVG (commented out):
      <svg viewBox="0 0 64 64" className="w-20 h-20" fill="currentColor">
        <ellipse cx="42" cy="40" rx="14" ry="5" fill="#8B4513" />
        <rect x="28" y="20" width="28" height="20" rx="2" fill="#A0522D" />
        <ellipse cx="42" cy="20" rx="14" ry="5" fill="#8B4513" />
        <circle cx="42" cy="20" r="6" fill="#2F1810" />
        <ellipse cx="18" cy="44" rx="16" ry="6" fill="#2F1810" />
        <rect x="2" y="22" width="32" height="22" rx="2" fill="#3D2314" />
        <ellipse cx="18" cy="22" rx="16" ry="6" fill="#2F1810" />
        <circle cx="18" cy="22" r="8" fill="#1a0d08" />
      </svg>
      */
    ),
  },
  {
    id: 'tiles',
    name: 'Piano',
    description: 'Colorful piano tile grid',
    gradient: 'from-green-400 to-emerald-600',
    icon: (
      <svg viewBox="0 0 64 64" className="w-20 h-20" fill="currentColor">
        <rect x="4" y="8" width="12" height="20" rx="2" fill="#FF6B6B" />
        <rect x="18" y="8" width="12" height="20" rx="2" fill="#FFE66D" />
        <rect x="32" y="8" width="12" height="20" rx="2" fill="#4ECDC4" />
        <rect x="46" y="8" width="12" height="20" rx="2" fill="#95E1D3" />
        <rect x="4" y="32" width="12" height="20" rx="2" fill="#F38181" />
        <rect x="18" y="32" width="12" height="20" rx="2" fill="#AA96DA" />
        <rect x="32" y="32" width="12" height="20" rx="2" fill="#FCBAD3" />
        <rect x="46" y="32" width="12" height="20" rx="2" fill="#A8D8EA" />
      </svg>
    ),
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Create your own instrument',
    gradient: 'from-cyan-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 64 64" className="w-20 h-20" fill="currentColor">
        <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 4" />
        <rect x="28" y="16" width="8" height="32" rx="2" fill="currentColor" />
        <rect x="16" y="28" width="32" height="8" rx="2" fill="currentColor" />
      </svg>
    ),
  },
];

// Custom icon (smaller for the shortcut)
const CustomIconSmall = () => (
  <svg viewBox="0 0 64 64" className="w-10 h-10" fill="currentColor">
    <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="8 4" />
    <rect x="28" y="16" width="8" height="32" rx="2" fill="currentColor" />
    <rect x="16" y="28" width="32" height="8" rx="2" fill="currentColor" />
  </svg>
);

// Arrow icons
const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

export default function InstrumentHome({ onSelectInstrument, error }: InstrumentHomeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const currentInstrument = instruments[currentIndex];

  const goToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % instruments.length);
    setAnimationKey((prev) => prev + 1);
  };

  const goToPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + instruments.length) % instruments.length);
    setAnimationKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8 overflow-auto">
      <div className="text-center space-y-6 px-4 w-full max-w-2xl">
        {/* Title */}
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          AirBeats
        </h1>
        <p className="text-lg md:text-xl text-blue-200 max-w-md mx-auto">
          Play instruments with your hands using just your webcam
        </p>

        {/* Instrument Carousel */}
        <div className="flex items-center justify-center gap-4 md:gap-8 mt-6">
          {/* Left Arrow */}
          <button
            onClick={goToPrev}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Previous instrument"
          >
            <ArrowLeft />
          </button>

          {/* Center Frame */}
          <div className="relative">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border-4 border-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-2xl">
              <button
                key={animationKey}
                onClick={() => onSelectInstrument(currentInstrument.id)}
                className="flex flex-col items-center gap-3 transition-transform duration-200 hover:scale-105 active:scale-95 animate-bounce-in"
              >
                <div
                  className={`w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br ${currentInstrument.gradient} flex items-center justify-center shadow-lg border-4 border-white/30 overflow-hidden p-3`}
                >
                  <div className="text-white/90 flex items-center justify-center">
                    {currentInstrument.icon}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{currentInstrument.name}</p>
                  <p className="text-blue-300/70 text-sm">{currentInstrument.description}</p>
                </div>
              </button>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-4">
              {instruments.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!isAnimating && index !== currentIndex) {
                      setIsAnimating(true);
                      setCurrentIndex(index);
                      setAnimationKey((prev) => prev + 1);
                    }
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                    index === currentIndex
                      ? 'bg-white scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to ${instruments[index].name}`}
                />
              ))}
            </div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={goToNext}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Next instrument"
          >
            <ArrowRight />
          </button>
        </div>

        {/* Play Button */}
        <button
          onClick={() => onSelectInstrument(currentInstrument.id)}
          className="px-10 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg font-bold rounded-full shadow-lg hover:shadow-pink-500/30 hover:scale-105 transition-all duration-200 active:scale-95"
        >
          Play {currentInstrument.name}
        </button>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl px-6 py-3 text-red-200 max-w-sm mx-auto">
            {error}
          </div>
        )}

        {/* Rules Section */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">How to Play</h2>
          <div className="flex justify-center gap-8 md:gap-16">
            {/* Fist for Drums/Tabla */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A6B7C] to-[#3D5A6A] border-2 border-[#5D7D8A] flex items-center justify-center overflow-hidden p-2">
                <img src="/svg/fist.svg" alt="Fist gesture" className="w-14 h-14 object-contain" />
                {/* Old Detailed Fist SVG (commented out):
                <svg viewBox="0 0 64 64" className="w-12 h-12">
                  <path d="M16 32 C16 24 20 20 28 20 L36 20 C44 20 48 24 48 32 L48 40 C48 50 42 54 32 54 C22 54 16 50 16 40 Z" fill="#F0C5A8"/>
                  <ellipse cx="14" cy="36" rx="6" ry="10" fill="#F0C5A8" />
                  <ellipse cx="13" cy="36" rx="4" ry="8" fill="#E8B69A" />
                  <ellipse cx="24" cy="22" rx="6" ry="5" fill="#F0C5A8" />
                  <ellipse cx="32" cy="21" rx="6" ry="5" fill="#F0C5A8" />
                  <ellipse cx="40" cy="22" rx="6" ry="5" fill="#F0C5A8" />
                  <ellipse cx="24" cy="21" rx="4" ry="3" fill="#F5D0B8" />
                  <ellipse cx="32" cy="20" rx="4" ry="3" fill="#F5D0B8" />
                  <ellipse cx="40" cy="21" rx="4" ry="3" fill="#F5D0B8" />
                  <path d="M20 26 Q24 28 28 26" stroke="#DDA68A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M28 25 Q32 27 36 25" stroke="#DDA68A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M36 26 Q40 28 44 26" stroke="#DDA68A" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M20 34 Q32 38 44 34" stroke="#DDA68A" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
                  <rect x="24" y="52" width="16" height="8" rx="3" fill="#F0C5A8" />
                  <rect x="26" y="54" width="12" height="4" rx="2" fill="#E8B69A" opacity="0.5"/>
                </svg>
                */}
              </div>
              <p className="text-white font-semibold">Fist</p>
              <p className="text-blue-300/70 text-sm">for Drums & Tabla</p>
            </div>

            {/* Index Finger for Tiles */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A6B7C] to-[#3D5A6A] border-2 border-[#5D7D8A] flex items-center justify-center overflow-hidden p-2">
                <img src="/svg/finger.svg" alt="Index finger gesture" className="w-14 h-14 object-contain" />
              </div>
              <p className="text-white font-semibold">Index Finger</p>
              <p className="text-blue-300/70 text-sm">for Tiles</p>
            </div>

            {/* Fingers for Piano Tiles */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A6B7C] to-[#3D5A6A] border-2 border-[#5D7D8A] flex items-center justify-center overflow-hidden p-2">
                <svg viewBox="0 0 64 64" className="w-14 h-14">
                  {/* Hand palm */}
                  <ellipse cx="32" cy="42" rx="16" ry="12" fill="#F0C5A8" />
                  {/* Four fingers raised */}
                  <ellipse cx="18" cy="22" rx="4" ry="12" fill="#E8B69A" />
                  <ellipse cx="27" cy="18" rx="4" ry="14" fill="#E8B69A" />
                  <ellipse cx="37" cy="18" rx="4" ry="14" fill="#E8B69A" />
                  <ellipse cx="46" cy="22" rx="4" ry="12" fill="#E8B69A" />
                  {/* Finger tip color indicators (1-4) */}
                  <circle cx="18" cy="11" r="4" fill="#FF6B6B" />
                  <circle cx="27" cy="5" r="4" fill="#4ECDC4" />
                  <circle cx="37" cy="5" r="4" fill="#FFE66D" />
                  <circle cx="46" cy="11" r="4" fill="#AA96DA" />
                  {/* Numbers on fingertips */}
                  <text x="18" y="14" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">1</text>
                  <text x="27" y="8" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">2</text>
                  <text x="37" y="8" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">3</text>
                  <text x="46" y="14" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">4</text>
                </svg>
              </div>
              <p className="text-white font-semibold">Fingers</p>
              <p className="text-blue-300/70 text-sm">for Piano Tiles</p>
            </div>
          </div>
        </div>

        {/* Custom Instrument Shortcut */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-3 text-blue-300/80">
            <span>Want to play custom instrument? Try this</span>
            <span className="text-white">→</span>
            <button
              onClick={() => onSelectInstrument('custom')}
              className="p-2 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:scale-110 transition-all duration-200 active:scale-95 shadow-lg hover:shadow-cyan-500/30"
              aria-label="Go to Custom Instrument"
            >
              <CustomIconSmall />
            </button>
          </div>
        </div>

        
      </div>

      {/* CSS for bounce animation */}
      <style>{`
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
      `}</style>
    </div>
  );
}

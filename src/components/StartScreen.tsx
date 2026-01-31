interface StartScreenProps {
  onStart: () => void;
  error: string | null;
}

export default function StartScreen({ onStart, error }: StartScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="text-center space-y-8 px-4">
        <h1 className="text-6xl font-extrabold bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          WebMusic
        </h1>
        <p className="text-xl text-blue-200 max-w-md mx-auto">
          Play drums with your hands using just your webcam. No controllers needed!
        </p>

        <button
          onClick={onStart}
          className="px-10 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-pink-500/30 hover:scale-105 transition-all duration-200 active:scale-95"
        >
          Start Playing
        </button>

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

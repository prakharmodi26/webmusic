import { useState, useRef, useEffect } from 'react';
import type { Song } from '../game/types';
import { MidiSongEngine } from '../game/MidiSongEngine';

interface SongInfo {
  song: Song;
  metadata: {
    name: string;
    bpm: number;
    noteCount: number;
    duration: string;
    pitchRange: string;
  };
}

interface SongSelectorProps {
  onSongSelect: (song: Song) => void;
  onBack: () => void;
}

export default function SongSelector({ onSongSelect, onBack }: SongSelectorProps) {
  const [songs, setSongs] = useState<SongInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const midiEngine = useRef(new MidiSongEngine());

  // Auto-discover songs from manifest on mount
  useEffect(() => {
    loadSongsFromManifest();
  }, []);

  async function loadSongsFromManifest() {
    setLoading(true);
    setError(null);

    let songPaths: string[] = [];
    try {
      const res = await fetch('/songs/manifest.json');
      if (res.ok) {
        songPaths = await res.json();
      }
    } catch {
      // manifest not available
    }

    const loadedSongs: SongInfo[] = [];
    for (const path of songPaths) {
      // Only load .mid/.midi files
      if (!/\.midi?$/i.test(path)) continue;
      try {
        const song = await midiEngine.current.loadSongFromUrl(path);
        const metadata = midiEngine.current.getSongMetadata(song);
        loadedSongs.push({ song, metadata });
      } catch (err) {
        console.warn(`Failed to load song: ${path}`, err);
      }
    }

    if (loadedSongs.length === 0 && songPaths.length > 0) {
      setError('Failed to load songs. Try uploading a custom MIDI file.');
    }

    loadedSongs.sort((a, b) => a.metadata.noteCount - b.metadata.noteCount);
    setSongs(loadedSongs);
    setLoading(false);
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      const song = await midiEngine.current.parseMidiFile(file);
      const metadata = midiEngine.current.getSongMetadata(song);

      // Add to front of list
      setSongs(prev => [{ song, metadata }, ...prev]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse MIDI file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleSongClick(songInfo: SongInfo) {
    onSongSelect(songInfo.song);
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-8">
      <div className="w-full max-w-lg">
        <h2 className="text-3xl font-bold text-white text-center mb-2">Select a Song</h2>
        <p className="text-gray-400 text-center mb-6">Choose a song to play or upload your own MIDI file</p>

        {/* Upload button */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mid,.midi"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
            </svg>
            Upload Custom MIDI
          </button>
          {uploadError && (
            <p className="text-red-400 text-sm mt-2 text-center">{uploadError}</p>
          )}
        </div>

        {/* Song list */}
        <div className="bg-gray-900/80 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 px-4">
              <p className="text-gray-400">{error}</p>
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-gray-400">No songs available. Upload a MIDI file to get started!</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-800">
              {songs.map((songInfo) => (
                <li key={songInfo.song.id}>
                  <button
                    onClick={() => handleSongClick(songInfo)}
                    className="w-full px-4 py-4 text-left hover:bg-gray-800/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate group-hover:text-purple-300 transition-colors">
                        {songInfo.metadata.name}
                      </h3>
                      <div className="flex gap-4 mt-1 text-sm text-gray-400">
                        <span>{songInfo.metadata.bpm} BPM</span>
                        <span>{songInfo.metadata.noteCount} notes</span>
                        <span>{songInfo.metadata.duration}</span>
                      </div>
                    </div>
                    <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="w-full mt-4 py-3 text-gray-400 hover:text-white transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

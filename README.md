# AirBeats

**Play virtual instruments with your hands using just a webcam.**

Made by **Prakhar Modi**

AirBeats is a browser-based music app that uses real-time hand tracking to let you play drums, tabla, piano tiles, and custom instruments through hand gestures. No controllers, no MIDI keyboards -- just your hands and a webcam.

---

## Instruments

### Drums
6-pad drum kit with crash, ride, snare, bass, toms, and hi-hat. Trigger pads by making a fist and moving it over them.

### Tabla
Traditional Indian percussion with 20+ sound variations (Na, Dhin, Dha, Ge, etc.). Uses fist gestures like drums. Sounds are swappable per pad.

### Piano Tiles
A rhythm game where tiles fall down 4 columns based on MIDI songs. Controls:
- **1 finger** = Column 1
- **2 fingers** = Column 2
- **3 fingers** = Column 3
- **4 fingers** = Column 4

Features:
- 10 bundled MIDI songs (auto-discovered from `public/songs/`)
- Upload your own `.mid` files
- Adjustable speed (0.25x to 1x)
- Auto-hit for consecutive same-column tiles
- Sound duration based on MIDI note length
- Songs capped at 500 notes max

### Piano (Tiles Grid)
21 piano keys (C3-B5) in a colorful grid. Point with your index finger to play notes.

### Custom
Build your own instrument. Add pads, choose from 60+ preset sounds or upload WAV/MP3 samples, drag/resize pads, customize colors and labels.

---

## Getting Started

### Prerequisites
- Node.js 18+
- Modern browser with webcam (Chrome or Edge recommended)

### Run Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Build

```bash
npm run build
npm run preview
```

---

## Adding Songs to Piano Tiles

Drop any `.mid` or `.midi` file into `public/songs/`. The Vite dev server auto-generates a manifest and the song appears in the selector immediately. In production, the manifest is generated at build time.

Songs are sorted by note count (easiest first) in the song selector. Songs with more than 500 notes are automatically truncated.

---

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **MediaPipe Tasks Vision** for hand tracking (Hand Landmarker)
- **Tone.js** for synthesized piano audio in Piano Tiles
- **Web Audio API** for drum/tabla/custom sample playback
- **@tonejs/midi** for MIDI file parsing
- **Canvas 2D** for all rendering

---

## Project Structure

```
src/
  components/
    PlaygroundPage.tsx      Main app - instrument selection + playground
    InstrumentHome.tsx      Home carousel with instrument cards
    PianoTilesGame.tsx      Piano Tiles rhythm game component
    SongSelector.tsx        MIDI song picker with upload support
    SettingsPanel.tsx       Settings sidebar (sensitivity, sounds, etc.)
    CameraView.tsx          Webcam video + canvas overlay
  core/
    pinchDetector.ts        Finger count detection (1-4 fingers = columns)
    gestureRecognizer.ts    Fist/palm gesture classification
    hitDetector.ts          Collision detection for pads
    handTracker.ts          MediaPipe hand landmarker wrapper
    audioEngine.ts          Web Audio sample playback engine
  game/
    PianoTilesEngine.ts     Core game loop, hit detection, auto-hit, scoring
    MidiSongEngine.ts       MIDI parsing, tile scheduling, height calculation
    types.ts                Game types (FallingTile, GameState, etc.)
  audio/
    ToneAudioEngine.ts      Tone.js synth for Piano Tiles note playback
  hooks/
    useCamera.ts            Webcam access hook
    useHandTracking.ts      MediaPipe tracking loop hook
    useHitDetection.ts      Pad hit detection hook
    useAudio.ts             Audio engine hook
    useDistanceGuide.ts     Hand distance feedback hook
  config/instruments/
    pianoTiles.ts           Piano Tiles game config (speed, colors, sizing)
    drumKit.ts              Drum kit pad layout + sounds
    tabla.ts                Tabla pad layout + sounds
    tiles.ts                Piano grid layout
    custom.ts               Custom instrument defaults
  utils/
    canvas.ts               Drawing helpers (pads, ripples, skeletons)
    geometry.ts             Point-in-region collision math
public/
  songs/                    MIDI files (auto-discovered)
  sounds/                   Audio samples (drums, tabla, piano)
  svg/                      Instrument icons
```

---

## Key Config Locations

These are useful if you want to tweak gameplay:

| What | File | Field |
|------|------|-------|
| Tile fall duration | `src/config/instruments/pianoTiles.ts` | `fallDuration` |
| Hit line position | `src/config/instruments/pianoTiles.ts` | `hitLineY` |
| Tile height range | `src/config/instruments/pianoTiles.ts` | `baseTileHeight`, `maxTileHeight` |
| Auto-hit gap | `src/game/PianoTilesEngine.ts` | `autoHitDelay` (ms) |
| Grace period | `src/game/PianoTilesEngine.ts` | `lastHitColumnsGrace` (ms) |
| Visibility gate | `src/game/PianoTilesEngine.ts` | `checkHits()` - `t.height` line |
| Max notes per song | `src/game/MidiSongEngine.ts` | `notes.length > 500` |
| Column colors | `src/config/instruments/pianoTiles.ts` | `columnColors` |

---

## How Hand Detection Works

**Drums/Tabla**: MediaPipe detects hand landmarks. A gesture recognizer classifies the hand as fist or open palm. Fist position is checked against circular pad regions for hit detection.

**Piano Tiles**: A finger count detector analyzes which fingers are extended using multiple voting methods (tip-to-palm distance, tip-vs-PIP joint, angle-based). The finger count maps to a column (1 finger = col 0, 2 = col 1, etc.). A 2-frame debounce prevents flicker.

**Piano Grid**: Index fingertip position is tracked and checked against tile regions.

---

## Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for hand tracking
- [Tone.js](https://tonejs.github.io/) for audio synthesis
- [@tonejs/midi](https://github.com/Tonejs/Midi) for MIDI parsing

# 🎵 AirBeats

**Play virtual instruments with your hands using just a webcam — no controllers needed!**

AirBeats is a browser-based music application that uses real-time hand tracking to let you play drums, tabla, and piano through intuitive hand gestures.

![AirBeats Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Tracking-orange)

---

## ✨ Features

- **🥁 Multiple Instruments**: Drums, Tabla, Piano Tiles, and Custom instruments
- **✋ Hand Gesture Recognition**: Fist detection for drums/tabla, fingertip tracking for piano
- **🎨 Customizable Pads**: Drag, resize, and customize instrument layouts
- **🔊 60+ Sound Presets**: Drums, tabla bols (Na, Dhin, Dha, etc.), and piano notes (C3-B5)
- **📱 Touch Support**: Works on tablets and touch-enabled devices
- **🚀 Zero Install**: Runs entirely in the browser

---

## 🎮 How to Play

### Getting Started

1. **Open the app** in Chrome or Edge (webcam required)
2. **Allow camera access** when prompted
3. **Select an instrument** from the carousel
4. **Position yourself** so your hands are visible in the camera

### Gesture Controls

| Instrument | Gesture | How to Trigger |
|------------|---------|----------------|
| **Drums** | ✊ Fist | Make a fist and move it over drum pads |
| **Tabla** | ✊ Fist | Make a fist and move it over tabla pads |
| **Piano Tiles** | ☝️ Index Finger | Point with your index finger and touch tiles |

### Tips for Best Performance

- 📏 **Distance**: Keep your hands 1-2 feet from the camera
- 💡 **Lighting**: Ensure good, even lighting on your hands
- 🎯 **Background**: Plain backgrounds help with hand detection
- 🖐️ **Clear gestures**: Make distinct fist/finger poses

---

## 🛠️ Installation & Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern browser (Chrome/Edge recommended)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/airbeats.git
cd airbeats

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

### Docker Deployment

```bash
# Build Docker image
docker build -t airbeats .

# Run container
docker run -p 80:80 airbeats
```

---

## 🎹 Instruments

### Drum Kit
6 pads with realistic drum sounds:
- Crash & Ride cymbals
- Snare drum
- Bass drum
- High & Low toms
- Hi-hat

### Tabla
Traditional Indian percussion with 20 sound variations:
- **Dayan (right)**: Na, Tin, Ti, Tey, Tay
- **Bayan (left)**: Ge, Gi, Ghay, Kut
- **Combined**: Dha, Dhin (with slide variations)

### Piano Tiles
21 piano keys across 3 octaves (C3 to B5) in a colorful grid layout.

### Custom
Create your own instrument:
- Add unlimited pads
- Choose from 60+ preset sounds
- Upload your own WAV/MP3 samples
- Customize colors and labels

---

## ⚙️ Settings

Access settings via the ⚙️ gear icon:

| Setting | Description |
|---------|-------------|
| **Beginner Mode** | Larger pad sizes for easier hits |
| **Hit Sensitivity** | Adjust how close your hand needs to be to trigger |
| **Sound Selection** | Change sounds for each pad (Tabla/Custom) |
| **Custom Upload** | Upload your own audio samples |

---

## 🏗️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Hand Tracking**: MediaPipe Tasks Vision (Hand Landmarker)
- **Audio**: Web Audio API
- **Rendering**: Canvas 2D API

---

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── PlaygroundPage   # Main instrument playground
│   ├── InstrumentHome   # Instrument selection carousel
│   ├── SettingsPanel    # Settings sidebar
│   └── ...
├── core/                # Core logic
│   ├── audioEngine      # Web Audio playback
│   ├── handTracker      # MediaPipe integration
│   ├── hitDetector      # FSM-based collision detection
│   └── gestureRecognizer# Fist/palm classification
├── hooks/               # Custom React hooks
├── config/              # Instrument configurations
│   └── instruments/     # Drum, tabla, tiles, custom configs
├── types/               # TypeScript interfaces
└── utils/               # Canvas drawing, geometry helpers

public/
└── sounds/              # Audio samples
    ├── piano/           # Piano notes (MP3)
    └── tabla/           # Tabla bols (WAV)
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) for hand tracking models
- [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) for piano samples
- [SampleSwap](https://sampleswap.org/) for tabla samples

---

<p align="center">
  Made with ❤️ and ✋ hand gestures
</p>


import pkg from '@tonejs/midi';
const { Midi } = pkg;
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'songs');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

// Helper to create a MIDI file from notes
function createMidi(name, bpm, notes) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.name = name;

  const track = midi.addTrack();
  track.name = name;

  for (const note of notes) {
    track.addNote({
      midi: note.midi,
      time: note.time,
      duration: note.duration,
      velocity: note.velocity || 0.8,
    });
  }

  return midi;
}

// Twinkle Twinkle Little Star
function generateTwinkleTwinkle() {
  const bpm = 100;
  const beatDuration = 60 / bpm;

  // C4=60, D4=62, E4=64, F4=65, G4=67, A4=69
  const melody = [
    // "Twinkle twinkle"
    { note: 60, beats: 1 }, { note: 60, beats: 1 },
    { note: 67, beats: 1 }, { note: 67, beats: 1 },
    { note: 69, beats: 1 }, { note: 69, beats: 1 },
    { note: 67, beats: 2 },

    // "Little star"
    { note: 65, beats: 1 }, { note: 65, beats: 1 },
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 62, beats: 1 }, { note: 62, beats: 1 },
    { note: 60, beats: 2 },

    // "How I wonder"
    { note: 67, beats: 1 }, { note: 67, beats: 1 },
    { note: 65, beats: 1 }, { note: 65, beats: 1 },
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 62, beats: 2 },

    // "What you are"
    { note: 67, beats: 1 }, { note: 67, beats: 1 },
    { note: 65, beats: 1 }, { note: 65, beats: 1 },
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 62, beats: 2 },

    // "Twinkle twinkle" (repeat)
    { note: 60, beats: 1 }, { note: 60, beats: 1 },
    { note: 67, beats: 1 }, { note: 67, beats: 1 },
    { note: 69, beats: 1 }, { note: 69, beats: 1 },
    { note: 67, beats: 2 },

    // "Little star"
    { note: 65, beats: 1 }, { note: 65, beats: 1 },
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 62, beats: 1 }, { note: 62, beats: 1 },
    { note: 60, beats: 2 },
  ];

  let time = 0;
  const notes = melody.map(item => {
    const note = {
      midi: item.note,
      time,
      duration: item.beats * beatDuration * 0.9,
      velocity: 0.8,
    };
    time += item.beats * beatDuration;
    return note;
  });

  return createMidi('Twinkle Twinkle Little Star', bpm, notes);
}

// Mary Had a Little Lamb
function generateMaryHadALittleLamb() {
  const bpm = 120;
  const beatDuration = 60 / bpm;

  // E4=64, D4=62, C4=60, G4=67
  const melody = [
    // "Mary had a"
    { note: 64, beats: 1 }, { note: 62, beats: 1 },
    { note: 60, beats: 1 }, { note: 62, beats: 1 },

    // "little lamb"
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 64, beats: 2 },

    // "little lamb"
    { note: 62, beats: 1 }, { note: 62, beats: 1 },
    { note: 62, beats: 2 },

    // "little lamb"
    { note: 64, beats: 1 }, { note: 67, beats: 1 },
    { note: 67, beats: 2 },

    // "Mary had a"
    { note: 64, beats: 1 }, { note: 62, beats: 1 },
    { note: 60, beats: 1 }, { note: 62, beats: 1 },

    // "little lamb its"
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 64, beats: 1 }, { note: 64, beats: 1 },

    // "fleece was white as snow"
    { note: 62, beats: 1 }, { note: 62, beats: 1 },
    { note: 64, beats: 1 }, { note: 62, beats: 1 },
    { note: 60, beats: 2 },
  ];

  let time = 0;
  const notes = melody.map(item => {
    const note = {
      midi: item.note,
      time,
      duration: item.beats * beatDuration * 0.9,
      velocity: 0.8,
    };
    time += item.beats * beatDuration;
    return note;
  });

  return createMidi('Mary Had a Little Lamb', bpm, notes);
}

// Ode to Joy
function generateOdeToJoy() {
  const bpm = 110;
  const beatDuration = 60 / bpm;

  // E4=64, F4=65, G4=67, D4=62, C4=60
  const melody = [
    // Line 1
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 65, beats: 1 }, { note: 67, beats: 1 },
    { note: 67, beats: 1 }, { note: 65, beats: 1 },
    { note: 64, beats: 1 }, { note: 62, beats: 1 },

    // Line 2
    { note: 60, beats: 1 }, { note: 60, beats: 1 },
    { note: 62, beats: 1 }, { note: 64, beats: 1 },
    { note: 64, beats: 1.5 }, { note: 62, beats: 0.5 },
    { note: 62, beats: 2 },

    // Line 3 (same as line 1)
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 65, beats: 1 }, { note: 67, beats: 1 },
    { note: 67, beats: 1 }, { note: 65, beats: 1 },
    { note: 64, beats: 1 }, { note: 62, beats: 1 },

    // Line 4
    { note: 60, beats: 1 }, { note: 60, beats: 1 },
    { note: 62, beats: 1 }, { note: 64, beats: 1 },
    { note: 62, beats: 1.5 }, { note: 60, beats: 0.5 },
    { note: 60, beats: 2 },

    // Bridge
    { note: 62, beats: 1 }, { note: 62, beats: 1 },
    { note: 64, beats: 1 }, { note: 60, beats: 1 },
    { note: 62, beats: 1 }, { note: 64, beats: 0.5 },
    { note: 65, beats: 0.5 }, { note: 64, beats: 1 },
    { note: 60, beats: 1 },

    // More bridge
    { note: 62, beats: 1 }, { note: 64, beats: 0.5 },
    { note: 65, beats: 0.5 }, { note: 64, beats: 1 },
    { note: 62, beats: 1 }, { note: 60, beats: 1 },
    { note: 62, beats: 1 }, { note: 55, beats: 2 }, // G3

    // Final line
    { note: 64, beats: 1 }, { note: 64, beats: 1 },
    { note: 65, beats: 1 }, { note: 67, beats: 1 },
    { note: 67, beats: 1 }, { note: 65, beats: 1 },
    { note: 64, beats: 1 }, { note: 62, beats: 1 },

    // End
    { note: 60, beats: 1 }, { note: 60, beats: 1 },
    { note: 62, beats: 1 }, { note: 64, beats: 1 },
    { note: 62, beats: 1.5 }, { note: 60, beats: 0.5 },
    { note: 60, beats: 2 },
  ];

  let time = 0;
  const notes = melody.map(item => {
    const note = {
      midi: item.note,
      time,
      duration: item.beats * beatDuration * 0.9,
      velocity: 0.8,
    };
    time += item.beats * beatDuration;
    return note;
  });

  return createMidi('Ode to Joy', bpm, notes);
}

// Generate all MIDI files
console.log('Generating MIDI files...');

const twinkle = generateTwinkleTwinkle();
writeFileSync(join(outDir, 'twinkle-twinkle.mid'), Buffer.from(twinkle.toArray()));
console.log('Created: twinkle-twinkle.mid');

const mary = generateMaryHadALittleLamb();
writeFileSync(join(outDir, 'mary-had-a-little-lamb.mid'), Buffer.from(mary.toArray()));
console.log('Created: mary-had-a-little-lamb.mid');

const ode = generateOdeToJoy();
writeFileSync(join(outDir, 'ode-to-joy.mid'), Buffer.from(ode.toArray()));
console.log('Created: ode-to-joy.mid');

console.log('Done! MIDI files created in public/songs/');

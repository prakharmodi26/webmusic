import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function songManifestPlugin() {
  const songsDir = path.resolve(__dirname, 'public/songs');
  const manifestPath = path.resolve(songsDir, 'manifest.json');

  function generateManifest() {
    if (!fs.existsSync(songsDir)) {
      fs.mkdirSync(songsDir, { recursive: true });
    }
    const files = fs.readdirSync(songsDir)
      .filter(f => /\.midi?$/i.test(f))
      .sort()
      .map(f => `/songs/${f}`);
    fs.writeFileSync(manifestPath, JSON.stringify(files, null, 2));
    return files;
  }

  return {
    name: 'song-manifest',
    buildStart() {
      generateManifest();
    },
    configureServer(server: { watcher: { on: (event: string, cb: (path: string) => void) => void } }) {
      generateManifest();
      // Watch for new/removed .mid files in dev
      server.watcher.on('all', (filePath: string) => {
        if (typeof filePath === 'string' && filePath.startsWith(songsDir) && /\.midi?$/i.test(filePath)) {
          generateManifest();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), songManifestPlugin()],
});

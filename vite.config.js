import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readStoreVersion } from './scripts/store-version.mjs';

// Browser fallback for the insights payload. Native builds read the same
// version from App.getInfo() at send time.
const storeVersion = readStoreVersion();

export default defineConfig({
  plugins: [react()],
  define: {
    __KIDSIT_APP_VERSION__: JSON.stringify(storeVersion),
  },
  server: { port: 5173 },
  build: { outDir: 'dist' },
});

import { defineConfig } from 'vite';

// Relative base so the build works from any path (static hosts, previews).
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 800 },
});

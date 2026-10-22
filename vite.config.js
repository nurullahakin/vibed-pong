import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths, so the build works under GitHub Pages' /vibed-pong/ folder
  base: './',
  build: {
    // Phaser alone is over a megabyte, so the default 500 kB warning always fires
    chunkSizeWarningLimit: 2000,
  },
});

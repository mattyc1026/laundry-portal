import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The site is published to https://matty1026.github.io/laundry-portal, so the
// production build has to be served from that sub-path. Without this base,
// every asset request goes to the domain root and the deployed page loads
// nothing but a blank screen. Dev keeps the plain root path.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/laundry-portal/' : '/',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
}));

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  // Only the production build needs the GitHub Pages subpath - applying it to
  // `vite` (dev) too makes localhost:5173/ 302-redirect to .../SportTeamManagementApp/
  // on every request, which is easy to mistake for a hang.
  base: command === 'build' ? '/SportTeamManagementApp/' : '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
}));

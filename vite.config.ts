import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// Plugin to prevent "[vite] failed to connect to websocket" error when HMR is disabled in container/proxy environments
function silenceViteWsPlugin(): Plugin {
  return {
    name: 'silence-vite-ws-client',
    transform(code, id) {
      if (id.includes('vite/dist/client/client.mjs')) {
        return code.replace(
          /new WebSocket\([^\)]+\)/g,
          '(() => { const dummy = new EventTarget(); dummy.readyState = 1; dummy.OPEN = 1; dummy.send = () => {}; dummy.close = () => {}; return dummy; })()'
        );
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), silenceViteWsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // Explicitly disable HMR WebSocket to resolve "[vite] failed to connect to websocket"
      hmr: false,
      ws: false as const,
      watch: null,
    },
  };
});

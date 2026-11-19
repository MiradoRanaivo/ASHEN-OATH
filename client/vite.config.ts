import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    // Les assets ne sont jamais recompilés : on évite au watcher de verrouiller
    // les gros PNG (EBUSY sous Windows) et on garde le HMR réactif.
    watch: {
      ignored: ['**/public/assets/**'],
    },
  },
});

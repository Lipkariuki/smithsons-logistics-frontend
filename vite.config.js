import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react(), {
    name: 'smithsons-release-diagnostic',
    transformIndexHtml() {
      const commit = process.env.RENDER_GIT_COMMIT || '';
      return /^[0-9a-f]{40}$/i.test(commit)
        ? [{ tag: 'meta', attrs: { name: 'smithsons-release', content: commit.toLowerCase() }, injectTo: 'head' }]
        : [];
    },
  }],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8054,
    strictPort: true,
  },
  preview: {
    port: 8054,
    strictPort: true,
  },
});

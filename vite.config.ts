import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'unsafe-inline'",
  "img-src 'self' data:",
  "manifest-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
].join('; ');

function injectCsp(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const meta = `\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`;
      return html.replace('<head>', `<head>${meta}`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [viteSingleFile(), injectCsp()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: false,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
});

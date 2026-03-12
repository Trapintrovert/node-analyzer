import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  outDir: 'dist',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  clean: true,
});

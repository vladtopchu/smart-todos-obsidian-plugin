import esbuild from 'esbuild';
const config = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  platform: 'browser',
  target: 'es2018',
  format: 'cjs',
  external: ['obsidian'],
  outfile: 'main.js',
  logLevel: 'info',
  sourcemap: false,
};
if (process.argv.includes('--watch')) {
  const context = await esbuild.context(config);
  await context.watch();
} else await esbuild.build(config);

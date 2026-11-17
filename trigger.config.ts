import { defineConfig } from '@trigger.dev/sdk';
import { ffmpeg } from '@trigger.dev/build/extensions/core';

export default defineConfig({
  project: 'proj_gtqdmodtodgdpjlpbpkr',
  runtime: 'bun-1.4',
  logLevel: 'log',
  maxDuration: 600,
  dirs: ['./src/trigger'],
  build: { extensions: [ffmpeg()] },
});

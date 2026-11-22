import { defineConfig } from '@trigger.dev/sdk';
import { ffmpeg } from '@trigger.dev/build/extensions/core';

export default defineConfig({
  project: 'proj_gtqdmodtodgdpjlpbpkr',
  runtime: 'bun-1.4',
  logLevel: 'log',
  maxDuration: 600,
  dirs: ['./src/trigger'],
  build: {
    // Trigger 4.8.8's Bun base still carries 1.4.4. Keep execution on the
    // security-patched binary rather than embedding the older compiler.
    bunBytecode: false,
    extensions: [
      ffmpeg(),
      {
        name: 'bun-security-runtime',
        onBuildComplete(context) {
          if (context.target === 'dev') return;
          context.addLayer({
            id: 'bun-1.4.5',
            image: {
              instructions: [
                'COPY --from=oven/bun:1.4.5-slim@sha256:b780593f3e10918cbdaec3d5a08d52224b9198069a65eb47812085c2ec007643 /usr/local/bin/bun /usr/local/bin/bun',
                'RUN test "$(bun --version)" = "1.4.5"',
              ],
            },
          });
        },
      },
    ],
  },
});

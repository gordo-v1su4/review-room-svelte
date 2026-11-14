FROM oven/bun:1.3.14
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates util-linux \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
COPY services/gpu-derivative-worker ./services/gpu-derivative-worker
COPY src/trigger/storageRetry.ts src/trigger/gpuWorker.ts ./src/trigger/
EXPOSE 8787
CMD ["bun", "run", "services/gpu-derivative-worker/index.ts"]

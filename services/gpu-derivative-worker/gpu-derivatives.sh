#!/usr/bin/env bash
set -euo pipefail

ffmpeg_bin=$1
input=$2
thumbnail=$3
sprite=$4
seek=$5
fps=$6

nvidia-smi -L >/dev/null
"$ffmpeg_bin" -nostdin -hide_banner -loglevel error -y -threads 1 -ss "$seek" \
  -hwaccel cuda -hwaccel_output_format cuda -i "$input" \
  -vf 'scale_cuda=320:-2,hwdownload,format=nv12' -frames:v 1 -threads:v 1 -q:v 3 "$thumbnail"
"$ffmpeg_bin" -nostdin -hide_banner -loglevel error -y -threads 1 \
  -hwaccel cuda -hwaccel_output_format cuda -i "$input" \
  -vf "scale_cuda=320:-2,hwdownload,format=nv12,fps=$fps,tile=10x1" \
  -frames:v 1 -threads:v 1 "$sprite"

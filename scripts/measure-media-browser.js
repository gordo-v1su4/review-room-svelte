// Evaluate through the in-app Browser CDP after selecting the same live clip.
// Temporary media elements are removed; no project/review metadata is changed.
(async () => {
  const posterPath = '/api/owner-poster/m97d5kdphq5aextmqafs3s1q3n8fgy6z?version=mh74cmr6rc8dm3jxz7q79pffpd8fhhy9&attempt=1';
  const mediaPath = posterPath.replace('owner-poster', 'owner-media');
  const samples = [];
  const wait = (element, event, run) => new Promise((resolve, reject) => {
    const start = performance.now();
    const timer = setTimeout(() => { cleanup(); reject(new Error(`${event} timed out`)); }, 20000);
    const done = () => { cleanup(); resolve(performance.now() - start); };
    const fail = () => { cleanup(); reject(new Error(`${event} failed`)); };
    function cleanup() { clearTimeout(timer); element.removeEventListener(event, done); element.removeEventListener('error', fail); }
    element.addEventListener(event, done, { once: true }); element.addEventListener('error', fail, { once: true }); run();
  });
  for (let index = 0; index < 5; index++) {
    const sampledPoster = `${posterPath}&measure=${Date.now()}-${index}`;
    for (const phase of ['cold', 'warm']) {
      const poster = new Image();
      const posterMs = await wait(poster, 'load', () => poster.src = sampledPoster);
      const video = document.createElement('video'); video.muted = true; video.preload = 'auto'; video.playsInline = true;
      video.style.cssText = 'position:fixed;width:1px;height:1px;left:-100px;pointer-events:none'; document.body.append(video);
      try {
        const canplayMs = await wait(video, 'canplay', () => { video.src = mediaPath; });
        const seekMs = await wait(video, 'seeked', () => video.currentTime = video.duration * 0.8);
        const start = performance.now();
        const response = await fetch(mediaPath, { headers: { Range: 'bytes=0-65535' }, cache: 'no-store' });
        const ttfbMs = performance.now() - start;
        await response.arrayBuffer();
        samples.push({ index: index + 1, phase, posterMs, canplayMs, seekMs, ttfbMs, status: response.status });
      } finally { video.removeAttribute('src'); video.load(); video.remove(); poster.removeAttribute('src'); }
    }
  }
  return { asset: 'VID_20261002_00013', samples, userAgent: navigator.userAgent };
})()

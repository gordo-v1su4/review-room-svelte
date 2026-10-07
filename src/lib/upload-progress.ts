/** The percentage describes bytes sent, not server ingest or processing. */
export function uploadWithProgress(url: string, body: File, progress: (percent: number) => void, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Upload cancelled.', 'AbortError')); return; }
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const cleanup = () => signal?.removeEventListener('abort', abort);
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', body.type);
    xhr.upload.onprogress = event => { if (event.lengthComputable && event.total > 0) progress(event.loaded / event.total * 100); };
    xhr.onload = () => { cleanup(); xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected the upload (${xhr.status}).`)); };
    xhr.onerror = () => { cleanup(); reject(new Error('Upload interrupted. Retry this file when the connection returns.')); };
    xhr.onabort = () => { cleanup(); reject(new DOMException('Upload cancelled.', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    xhr.send(body);
  });
}

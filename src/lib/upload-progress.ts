/** The percentage describes bytes sent, not server ingest or processing. */
export function uploadWithProgress(url: string, body: File, progress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('content-type', body.type);
    xhr.upload.onprogress = event => { if (event.lengthComputable && event.total > 0) progress(event.loaded / event.total * 100); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage rejected the upload (${xhr.status}).`));
    xhr.onerror = () => reject(new Error('Upload interrupted. Check the connection and the project before trying again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(body);
  });
}

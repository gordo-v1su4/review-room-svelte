"use client";

import { useEffect, useState } from "react";

export function useStorageUrl(storageKey?: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void fetch("/api/storage/presign-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageKey }),
    })
      .then((r) => r.json())
      .then((data: { downloadUrl?: string }) => {
        if (!cancelled) setUrl(data.downloadUrl ?? null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  return url;
}

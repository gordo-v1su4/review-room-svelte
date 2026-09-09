"use client";

import { useEffect, useState } from "react";

type CachedStorageUrl = {
  url: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 55 * 60 * 1000;
const memoryCache = new Map<string, CachedStorageUrl>();
const inFlight = new Map<string, Promise<string | null>>();

function cacheId(storageKey: string, version?: string | number | null) {
  return version == null ? storageKey : `${storageKey}:${version}`;
}

function readSessionCache(storageKey: string, version?: string | number | null) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`storage-url:${cacheId(storageKey, version)}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedStorageUrl;
    if (!cached.url || cached.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(`storage-url:${cacheId(storageKey, version)}`);
      return null;
    }
    memoryCache.set(cacheId(storageKey, version), cached);
    return cached.url;
  } catch {
    return null;
  }
}

function writeCache(storageKey: string, url: string, version?: string | number | null) {
  const cached = { url, expiresAt: Date.now() + CACHE_TTL_MS };
  memoryCache.set(cacheId(storageKey, version), cached);
  memoryCache.set(storageKey, cached);
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      `storage-url:${cacheId(storageKey, version)}`,
      JSON.stringify(cached),
    );
    window.sessionStorage.setItem(`storage-url:${storageKey}`, JSON.stringify(cached));
  } catch {
    // Best-effort cache only.
  }
}

async function getStorageUrl(storageKey: string, version?: string | number | null) {
  const id = cacheId(storageKey, version);
  const cached = memoryCache.get(id);
  if (cached?.expiresAt && cached.expiresAt > Date.now()) return cached.url;

  const sessionUrl = readSessionCache(storageKey, version);
  if (sessionUrl) return sessionUrl;

  const existing = inFlight.get(id);
  if (existing) return existing;

  const request = fetch("/api/storage/presign-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storageKey }),
  })
    .then((r) => r.json())
    .then((data: { downloadUrl?: string }) => {
      if (!data.downloadUrl) return null;
      writeCache(storageKey, data.downloadUrl, version);
      return data.downloadUrl;
    })
    .catch(() => null)
    .finally(() => {
      inFlight.delete(id);
    });

  inFlight.set(id, request);
  return request;
}

function readCachedUrl(storageKey: string, version?: string | number | null) {
  const versioned = memoryCache.get(cacheId(storageKey, version));
  if (versioned?.expiresAt && versioned.expiresAt > Date.now()) return versioned.url;
  const unversioned = memoryCache.get(storageKey);
  if (unversioned?.expiresAt && unversioned.expiresAt > Date.now()) return unversioned.url;
  return readSessionCache(storageKey, version) ?? readSessionCache(storageKey);
}

export function useStorageUrl(storageKey?: string | null, version?: string | number | null) {
  const identity = storageKey ? cacheId(storageKey, version) : "";
  const [snapshot, setSnapshot] = useState(() => ({
    identity,
    url: storageKey ? readCachedUrl(storageKey, version) : null,
  }));

  // Drop the previous asset's URL immediately when the storage key changes.
  // Otherwise the viewer can bind the new selection to the old signed URL.
  if (identity !== snapshot.identity) {
    setSnapshot({
      identity,
      url: storageKey ? readCachedUrl(storageKey, version) : null,
    });
  }

  useEffect(() => {
    if (!storageKey) return;
    let cancelled = false;
    void getStorageUrl(storageKey, version).then((nextUrl) => {
      if (cancelled || !nextUrl) return;
      setSnapshot((current) => {
        if (current.identity !== cacheId(storageKey, version)) return current;
        // Keep the first working URL so a later re-presign does not reload <video>.
        return { ...current, url: current.url ?? nextUrl };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [storageKey, version]);

  return snapshot.url;
}

export function prefetchStorageUrl(
  storageKey?: string | null,
  version?: string | number | null,
) {
  if (!storageKey) return;
  void getStorageUrl(storageKey, version);
}

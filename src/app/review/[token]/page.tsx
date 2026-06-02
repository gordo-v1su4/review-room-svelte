"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VideoGrid } from "@/components/video/VideoGrid";
import { VideoDetailsPanel } from "@/components/video/VideoDetailsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GridSize } from "@/lib/types";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const data = useQuery(api.reviewPublic.getProjectByToken, { token });
  const queriedVideos = useQuery(api.reviewPublic.listVideosByToken, { token });
  const videos = useMemo(() => queriedVideos ?? [], [queriedVideos]);
  const savedName = useQuery(api.reviewPublic.getReviewerName, { token });
  const verifyPasscode = useMutation(api.reviewLinks.verifyPasscode);
  const setReviewerName = useMutation(api.reviewPublic.setReviewerName);

  const [unlocked, setUnlocked] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState<Id<"videos"> | null>(null);
  const gridSize: GridSize = "md";

  useEffect(() => {
    if (data && !data.link.passcodeHash) setUnlocked(true);
  }, [data]);

  const selected = useMemo(
    () => videos.find((v) => v._id === selectedId) ?? null,
    [videos, selectedId],
  );

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-zinc-500">
        Loading review…
      </div>
    );
  }

  const { project } = data;

  if (!unlocked && data.link.passcodeHash) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-xl font-semibold">{project.title}</h1>
        <p className="text-sm text-zinc-400">Enter the passcode to continue.</p>
        <Input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
        />
        <Button
          onClick={() =>
            void verifyPasscode({ token, passcode }).then((r) => {
              if (r.ok) setUnlocked(true);
            })
          }
        >
          Continue
        </Button>
      </div>
    );
  }

  if (!savedName && !name.trim()) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-xl font-semibold">{project.title}</h1>
        <p className="text-sm text-zinc-400">Your name appears on comments.</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        <Button
          disabled={!name.trim()}
          onClick={() =>
            void setReviewerName({ token, displayName: name.trim() })
          }
        >
          Start review
        </Button>
      </div>
    );
  }

  const reviewerName = savedName ?? name;

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-6 py-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {project.title}
        </h1>
        {project.description && (
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            {project.description}
          </p>
        )}
      </header>
      <div className="flex">
        <div className="min-w-0 flex-1 p-6">
          <VideoGrid
            videos={videos}
            selectedId={selectedId ?? undefined}
            size={gridSize}
            onSelect={setSelectedId}
            empty={<p className="text-zinc-500">No videos in this review yet.</p>}
          />
        </div>
        {selected && (
          <VideoDetailsPanel
            video={selected}
            mode="client"
            token={token}
            reviewerName={reviewerName}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

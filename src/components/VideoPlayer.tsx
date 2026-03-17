"use client";

import { useRef, useState, useEffect } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  src: string;
  title?: string;
  onProgress?: (progress: number) => void;
  autoFullscreen?: boolean;
  startProgress?: number; // 0–1, seek to this position on load
}

export default function VideoPlayer({ src, title, onProgress, autoFullscreen, startProgress }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || error) return;

    const isHls = src.includes(".m3u8") || src.includes("hls");

    function onMetadata() {
      if (startProgress && startProgress > 0 && video.duration > 0) {
        video.currentTime = startProgress * video.duration;
      }
      setReady(true);
      if (!autoFullscreen) video.play().catch(() => {});
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, maxMaxBufferLength: 60 });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, onMetadata);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else setError(true);
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
    } else {
      video.src = src;
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, error, autoFullscreen]);

  function handleStartClick() {
    const video = videoRef.current;
    if (!video) return;
    setStarted(true);
    video.play().catch(() => {});
    video.requestFullscreen?.().catch(() => {});
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {error ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <p className="text-sm text-white/50">Failed to load video</p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm transition-colors hover:bg-white/10"
          >
            Open in external player
          </a>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            controls
            className="h-full w-full"
            title={title}
            onError={() => setError(true)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (onProgress && v.duration > 0) onProgress(v.currentTime / v.duration);
            }}
          >
            Your browser does not support video playback.
          </video>

          {/* Tap-to-play overlay for autoFullscreen mode */}
          {autoFullscreen && !started && (
            <button
              onClick={handleStartClick}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full transition-transform hover:scale-105"
                style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.4)" }}
              >
                {ready ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <div
                    className="h-7 w-7 animate-spin rounded-full border-2"
                    style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
                  />
                )}
              </div>
              {ready && (
                <p className="text-sm text-white/60">Tap to play</p>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

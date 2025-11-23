"use client";

import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { cn } from "@/lib/utils";

interface VideoPosterProps {
  src: string;
  poster?: string;
  className?: string;
  alt?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onVideoEnd?: () => void;
  onPosterLoad?: () => void;
}

export interface VideoPosterRef {
  play: () => void;
  pause: () => void;
  replay: () => void;
  toggleLoop: () => void;
  isLooping: boolean;
}

export const VideoPoster = forwardRef<VideoPosterRef, VideoPosterProps>(
  (
    {
      src,
      poster,
      className,
      alt,
      autoPlay = true,
      loop = false,
      onVideoEnd,
      onPosterLoad,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [videoEnded, setVideoEnded] = useState(false);
    const [isLooping, setIsLooping] = useState(loop);

    useImperativeHandle(ref, () => ({
      play: () => {
        if (videoRef.current) {
          setVideoEnded(false);
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      replay: () => {
        if (videoRef.current) {
          setVideoEnded(false);
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
      },
      toggleLoop: () => {
        setIsLooping((prev) => {
          const newLoop = !prev;
          if (videoRef.current) {
            videoRef.current.loop = newLoop;
          }
          return newLoop;
        });
      },
      isLooping,
    }));

    useEffect(() => {
      if (autoPlay && videoRef.current) {
        videoRef.current.play().catch(() => {
          // Auto-play might be blocked
        });
      }
    }, [src, autoPlay]);

    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.loop = isLooping;
      }
    }, [isLooping]);

    const handleVideoEnd = () => {
      setVideoEnded(true);
      onVideoEnd?.();
    };

    return (
      <div
        className={cn(
          "relative w-full h-full overflow-hidden bg-zinc-900",
          className
        )}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          playsInline
          autoPlay={autoPlay}
          loop={isLooping}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
            isLoaded && !videoEnded ? "opacity-100" : "opacity-0"
          )}
          onLoadedData={() => setIsLoaded(true)}
          onEnded={handleVideoEnd}
        />
        <img
          src={poster || "/placeholder.svg"}
          alt={alt || "Poster"}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-all ease-out poster-media",
            videoEnded || !isLoaded
              ? "opacity-100 blur-0 scale-100"
              : "opacity-0 blur-md scale-[1.02]"
          )}
          style={{
            transition:
              "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out",
            willChange: "opacity, filter, transform",
          }}
          onLoad={() => {
            if (videoEnded || !isLoaded) {
              onPosterLoad?.();
            }
          }}
        />
      </div>
    );
  }
);

VideoPoster.displayName = "VideoPoster";

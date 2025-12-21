"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { DesktopSidebar } from "./desktop-home";
import { useFavorites } from "@/hooks/use-favorites";
import { useWatched } from "@/hooks/use-watched";
import { Loader2, Play, Info, X, ChevronRight, Heart } from "lucide-react";
import Script from "next/script";

interface Channel {
  id: string;
  title: string;
  logo: string | null;
  group: string;
  url: string;
}

const M3U_URL = "https://smolnp.github.io/IPTVru//IPTVru.m3u";

export function TvClient() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Все каналы");
  
  // Video refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const dashRef = useRef<any>(null);

  const { favorites, addFavorite, toggleFavorite } = useFavorites();
  const { watched } = useWatched();

  // Load Dash.js & HLS.js
  const [dashReady, setDashReady] = useState(false);
  const [hlsReady, setHlsReady] = useState(false);

  // --- Fetch Channels ---
  useEffect(() => {
    fetch(M3U_URL)
      .then((res) => res.text())
      .then((text) => {
        const lines = text.split("\n");
        const parsedChannels: Channel[] = [];
        let currentChannel: Partial<Channel> = {};

        for (let line of lines) {
          line = line.trim();
          if (line.startsWith("#EXTINF:")) {
            const info = line.substring(8);
            const parts = info.split(",");
            const title = parts[parts.length - 1].trim();
            const logoMatch = info.match(/tvg-logo="([^"]*)"/);
            const groupMatch = info.match(/group-title="([^"]*)"/);

            currentChannel = {
              title,
              logo: logoMatch ? logoMatch[1] : null,
              group: groupMatch ? groupMatch[1] : "Другое",
            };
          } else if (line.startsWith("http")) {
            if (currentChannel.title) {
              // Generate a simple hash from the URL for a stable ID
              let hash = 0;
              for (let i = 0; i < line.length; i++) {
                const char = line.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash; // Convert to 32bit integer
              }
              const stableId = "tv-" + Math.abs(hash).toString(36);

              parsedChannels.push({
                id: stableId,
                ...currentChannel,
                url: line,
              } as Channel);
              currentChannel = {};
            }
          }
        }
        setChannels(parsedChannels);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch playlist", err);
        setLoading(false);
      });
  }, []);

  // --- Categories ---
  const categories = useMemo(() => {
    const cats = new Set(channels.map((c) => c.group));
    return ["Все каналы", "Избранное", ...Array.from(cats)];
  }, [channels]);

  // --- Filtered Channels ---
  const filteredChannels = useMemo(() => {
    if (selectedCategory === "Все каналы") return channels;
    if (selectedCategory === "Избранное") {
        return channels.filter(c => favorites.some(f => f.id === c.id));
    }
    return channels.filter((c) => c.group === selectedCategory);
  }, [channels, selectedCategory, favorites]);

  // --- Player Logic ---
  useEffect(() => {
    if (!activeChannel || !videoRef.current) return;

    const video = videoRef.current;
    let isCleanedUp = false;
    
    // Clean up
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      dashRef.current.reset();
      dashRef.current = null;
    }

    const loadStream = (url: string, isProxy = false) => {
        if (isCleanedUp) return;
        
        const isDash = url.endsWith(".mpd");
        
        if (isDash && window.dashjs) {
            const player = window.dashjs.MediaPlayer().create();
            
            // Error handling for DASH
            player.on("error", (e: any) => {
                console.warn("DASH Error", e);
                // Check if it's a download error (likely CORS or network)
                if (e.error === "download" && !isProxy) {
                    console.warn("DASH Download Error, switching to proxy...");
                    player.reset();
                    loadStream(`/api/proxy?url=${encodeURIComponent(activeChannel.url)}`, true);
                }
            });

            player.initialize(video, url, true);
            dashRef.current = player;
        } else if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                xhrSetup: function (xhr: any, url: string) {
                    xhr.withCredentials = false; // Important for some CORS scenarios
                },
            });
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
            
            // Error Handling
            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                 if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            if (!isProxy) {
                                console.warn("HLS: Network Error, switching to proxy...");
                                hls.destroy();
                                loadStream(`/api/proxy?url=${encodeURIComponent(activeChannel.url)}`, true);
                            } else {
                                console.warn("HLS: Network Error (Proxy failed), trying to recover...");
                                hls.startLoad();
                            }
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.warn("HLS: Media Error, trying to recover...");
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error("HLS: Fatal Error, cannot recover", data);
                            hls.destroy();
                            break;
                    }
                 }
            });
            hlsRef.current = hls;
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
            video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
            
            // Simple retry for native player (Safari)
            const errorHandler = () => {
                 if (!isProxy) {
                     console.warn("Native Video Error, switching to proxy...");
                     video.removeEventListener('error', errorHandler);
                     loadStream(`/api/proxy?url=${encodeURIComponent(activeChannel.url)}`, true);
                 }
            };
            video.addEventListener('error', errorHandler);
        }
    };

    loadStream(activeChannel.url, false);

    return () => {
      isCleanedUp = true;
      if (hlsRef.current) hlsRef.current.destroy();
      if (dashRef.current) dashRef.current.reset();
      video.removeAttribute('src');
      video.load();
    };
  }, [activeChannel, hlsReady, dashReady]);

  return (
    <div className="flex min-h-screen bg-black text-white font-sans selection:bg-white/20">
      <Script src="https://cdn.jsdelivr.net/npm/hls.js@latest" onLoad={() => setHlsReady(true)} />
      <Script src="https://cdn.dashjs.org/latest/dash.all.min.js" onLoad={() => setDashReady(true)} />
      
      <DesktopSidebar
        activeRoute="/tv"
        favoritesCount={favorites?.length || 0}
        watchedCount={watched?.length || 0}
      />

      <main className="ml-[clamp(64px,8vw,96px)] flex-1 w-full min-h-screen relative z-10 px-4 py-6 md:px-6 md:py-10">
        {loading ? (
          <div className="fixed inset-0 left-[clamp(64px,8vw,96px)] z-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-white/50" />
          </div>
        ) : (
          <div className="max-w-[1920px] mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                Смотреть каналы
              </h1>
              
              {/* Category Tabs */}
              <div className="relative group">
                <div className="flex flex-wrap gap-x-6 gap-y-2 pb-4 items-center">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`
                        whitespace-nowrap text-base md:text-lg font-medium transition-colors duration-200
                        ${selectedCategory === cat 
                          ? "text-white" 
                          : "text-zinc-500 hover:text-zinc-300"
                        }
                      `}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setActiveChannel(channel)}
                  className="group relative flex items-center justify-between p-4 md:p-6 bg-[#1a1a1a] hover:bg-[#252525] rounded-xl transition-all duration-200 text-left w-full border border-transparent hover:border-zinc-700"
                >
                  {/* Favorite Button */}
                  <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite({
                            id: channel.id,
                            title: channel.title,
                            logo: channel.logo,
                            type: "tv-channel"
                        });
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full hover:bg-white/10 z-20 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    style={{ opacity: favorites.some(f => f.id === channel.id) ? 1 : undefined }}
                  >
                    <Heart 
                        className={`w-5 h-5 ${
                            favorites.some(f => f.id === channel.id) 
                                ? "fill-red-500 text-red-500" 
                                : "text-zinc-500 group-hover:text-zinc-300"
                        }`} 
                    />
                  </div>

                  <div className="flex flex-col gap-1 pr-4 flex-1 min-w-0">
                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider truncate">
                      {channel.group}
                    </span>
                    <span className="text-base md:text-lg font-bold text-zinc-100 group-hover:text-white leading-tight line-clamp-2">
                      {channel.title}
                    </span>
                    {/* Placeholder for current program if we had EPG */}
                    <span className="text-xs text-zinc-600 mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-green-500 transition-colors" />
                      Сейчас в эфире
                    </span>
                  </div>
                  
                  {channel.logo ? (
                    <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full bg-white/5 p-2 flex items-center justify-center overflow-hidden">
                      <img 
                        src={channel.logo} 
                        alt={channel.title}
                        className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => {
                            // Fallback if image fails
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                     <div className="w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full bg-white/5 flex items-center justify-center">
                        <span className="text-xl font-bold text-zinc-700 group-hover:text-zinc-500">
                            {channel.title.charAt(0)}
                        </span>
                     </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Player Overlay Modal */}
      {activeChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/10">
            {/* Close Button */}
            <button 
              onClick={() => setActiveChannel(null)}
              className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Video Player */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
              crossOrigin="anonymous" 
            />

            {/* Overlay Info (visible on hover/pause usually, but kept simple here) */}
            <div className="absolute top-4 left-4 z-40 pointer-events-none">
                <div className="flex items-center gap-3">
                    {activeChannel.logo && (
                        <img src={activeChannel.logo} className="w-8 h-8 object-contain drop-shadow-md" />
                    )}
                    <h2 className="text-lg font-bold drop-shadow-md">{activeChannel.title}</h2>
                    <span className="px-2 py-0.5 bg-red-600 text-[10px] font-bold rounded uppercase tracking-wider animate-pulse">
                        Live
                    </span>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add global definitions
declare global {
  interface Window {
    Hls: any;
    dashjs: any;
  }
  var Hls: any;
  var dashjs: any;
}

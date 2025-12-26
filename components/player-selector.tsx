"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Tv, Sparkles, Zap, Activity, Info, X } from "lucide-react";

interface PlayerSelectorProps {
  onPlayerSelect?: (playerId: number) => void;
  onClose?: () => void;
  iframeUrl?: string;
  kpId?: string;
  className?: string;
  videoContainerClassName?: string;
  videoContainerStyle?: React.CSSProperties;
  floatingControls?: boolean;
  movieLogo?: string;
}

export function PlayerSelector({
  onPlayerSelect,
  onClose,
  iframeUrl,
  kpId,
  className = "",
  videoContainerClassName = "",
  videoContainerStyle,
  floatingControls = false,
  movieLogo,
}: PlayerSelectorProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [hoveredPlayer, setHoveredPlayer] = useState<number | null>(null);

  const handlePlayerSelect = (playerId: number) => {
    setSelectedPlayer(playerId);
    onPlayerSelect?.(playerId);
  };

  // Формируем URL для второго плеера
  const getPlayer2Url = () => {
    if (!kpId) return null;
    return `https://92d73433.obrut.show/embed/MjM/kinopoisk/${kpId}`;
  };

  // Формируем URL для третьего плеера
  const getPlayer3Url = () => {
    if (!kpId) return null;
    return `https://looking.as.newplayjj.com:9443/?kp=${kpId}&token=5af6e7af5ffb19f2ddb300d28d90f8&season=1&episode=1`;
  };

  // Формируем URL для четвертого плеера (RSTPRG)
  const getPlayer4Url = () => {
    if (!kpId) return null;
    return `https://api.rstprgapipt.com/balancer-api/iframe?kp=${kpId}&token=eyJhbGciOiJIUzI1NiJ9.eyJ3ZWJTaXRlIjoiNTM5IiwiaXNzIjoiYXBpLXdlYm1hc3RlciIsInN1YiI6IjYwNiIsImlhdCI6MTc2Njc1MjU0OCwianRpIjoiOGQ1MDhjMTQtNjRlZS00NGM0LWFjYjUtNjg2NjA1MmNiMDMwIiwic2NvcGUiOiJETEUifQ.n43myxCQ1dV_5_UpJA_7pThO-AYy0irAAQco0TE9hd0`;
  };

  // Доступность плееров
  const player1Available = Boolean(iframeUrl);
  const player2Available = Boolean(kpId);
  const player3Available = Boolean(kpId);
  const player4Available = Boolean(kpId);

  useEffect(() => {
    if (selectedPlayer == null) {
      if (player4Available) {
        handlePlayerSelect(4);
      } else if (player2Available) {
        handlePlayerSelect(2);
      } else if (player1Available) {
        handlePlayerSelect(1);
      } else if (player3Available) {
        handlePlayerSelect(3);
      }
    }
  }, [
    player2Available,
    player1Available,
    player3Available,
    player4Available,
    kpId,
    iframeUrl,
    selectedPlayer,
  ]);

  const getPlayerUrl = (playerId: number | null) => {
    if (playerId === 1) return iframeUrl ?? null;
    if (playerId === 2) return getPlayer2Url();
    if (playerId === 3) return getPlayer3Url();
    if (playerId === 4) return getPlayer4Url();
    return null;
  };

  const getPlayerLabel = (playerId: number) => {
    return `Плеер ${playerId}`;
  };

  const getPlayerIcon = (playerId: number) => {
    switch (playerId) {
      case 1: return <Tv size={16} />;
      case 2: return <Activity size={16} />;
      case 3: return <Zap size={16} />;
      case 4: return <Sparkles size={16} />;
      default: return null;
    }
  };

  const selectedUrl = getPlayerUrl(selectedPlayer);

  const hasFixedStyle =
    !!videoContainerStyle &&
    (videoContainerStyle.height != null || videoContainerStyle.width != null);

  return floatingControls ? (
    <div className={`relative w-full h-full ${className} group/container`}>
      {/* Minimalist Vertical Player Dock */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2.5 p-1.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl"
      >
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((playerId) => {
            const disabled =
              (playerId === 1 && !player1Available) ||
              (playerId === 2 && !player2Available) ||
              (playerId === 3 && !player3Available) ||
              (playerId === 4 && !player4Available);
            const isActive = selectedPlayer === playerId;
            const isHovered = hoveredPlayer === playerId;

            return (
              <div key={playerId} className="relative flex items-center justify-end">
                {/* Minimal Tooltip */}
                <AnimatePresence>
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: -8 }}
                      exit={{ opacity: 0, x: -5 }}
                      className="absolute right-full whitespace-nowrap px-2 py-1 rounded-lg bg-white text-black text-[10px] font-black uppercase tracking-tighter shadow-xl pointer-events-none z-50 mr-1"
                    >
                      {getPlayerLabel(playerId)}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onMouseEnter={() => setHoveredPlayer(playerId)}
                  onMouseLeave={() => setHoveredPlayer(null)}
                  onClick={() => {
                    if (!disabled) handlePlayerSelect(playerId);
                  }}
                  disabled={disabled}
                  className={`group relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl border transition-all duration-300 ${
                    disabled
                      ? "border-white/5 bg-white/5 text-white/20 cursor-not-allowed opacity-40"
                      : isActive
                      ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105 z-10"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:border-white/30 hover:text-white"
                  }`}
                >
                  <span className="text-[11px] font-black uppercase">П{playerId}</span>

                  {/* NEW Badge refinement */}
                  {playerId === 4 && !disabled && (
                    <div className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border border-black/20 shadow-[0_0_8px_#3b82f6]"></span>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Separator */}
        <div className="w-8 h-[1px] bg-white/10" />

        {/* Close button */}
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300"
          title="Закрыть плеер"
        >
          <X size={18} />
        </button>
      </motion.div>

      <div
        className={`group relative w-full h-full rounded-[24px] overflow-hidden ${
          videoContainerClassName || "bg-black"
        } shadow-[0_30px_100px_rgba(0,0,0,0.8)] ring-1 ring-white/10 z-0 transition-all duration-700`}
        style={videoContainerStyle}
      >
        {selectedUrl ? (
          <>
            {movieLogo && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 0.7, y: 0 }}
                className="hidden md:flex absolute top-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none"
              >
                <img 
                  src={movieLogo} 
                  alt="Logo" 
                  className="h-[clamp(40px,6vh,60px)] w-auto object-contain"
                />
              </motion.div>
            )}
            <iframe
              src={selectedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title="Movie Player"
              style={{ zIndex: 1 }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            <span className="text-sm">Плеер недоступен</span>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className={`space-y-4 ${className}`}>
      {/* Player Controls - Top */}
      <div className="mb-4">
        <Select
          value={selectedPlayer ? String(selectedPlayer) : undefined}
          onValueChange={(val) => handlePlayerSelect(Number(val))}
        >
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-white/10 text-zinc-200 relative z-10">
            <SelectValue placeholder="Выберите плеер" />
          </SelectTrigger>
          <SelectContent className="z-[150]" position="popper">
            {[1, 2, 3, 4].map((playerId) => {
              const disabled =
                (playerId === 1 && !player1Available) ||
                (playerId === 2 && !player2Available) ||
                (playerId === 3 && !player3Available) ||
                (playerId === 4 && !player4Available);

              return (
                <SelectItem
                  key={playerId}
                  value={String(playerId)}
                  disabled={disabled}
                  className="cursor-pointer"
                >
                  Плеер {playerId}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div
        className={`group relative w-full ${
          hasFixedStyle ? "" : "aspect-video"
        } rounded-xl overflow-hidden ${
          videoContainerClassName || "bg-black"
        } shadow-2xl ring-1 ring-white/10 z-0`}
        style={videoContainerStyle}
      >
        {selectedUrl ? (
          <>
            {movieLogo && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 0.7, y: 0 }}
                className="hidden md:flex absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none"
              >
                <img 
                  src={movieLogo} 
                  alt="Logo" 
                  className="h-[45px] w-auto object-contain"
                />
              </motion.div>
            )}
            <iframe
              src={selectedUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title="Movie Player"
              style={{ zIndex: 1 }}
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            <span className="text-sm">Плеер недоступен</span>
          </div>
        )}
      </div>
    </div>
  );
}

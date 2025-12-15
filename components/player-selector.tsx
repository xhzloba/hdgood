"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlayerSelectorProps {
  onPlayerSelect?: (playerId: number) => void;
  onClose?: () => void;
  iframeUrl?: string;
  kpId?: string;
  className?: string;
  videoContainerClassName?: string;
  videoContainerStyle?: React.CSSProperties;
  floatingControls?: boolean;
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
}: PlayerSelectorProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);

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

  // Доступность плееров
  const player1Available = Boolean(iframeUrl);
  const player2Available = Boolean(kpId);
  const player3Available = Boolean(kpId);

  useEffect(() => {
    if (selectedPlayer == null) {
      if (player2Available) {
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
    kpId,
    iframeUrl,
    selectedPlayer,
  ]);

  const getPlayerUrl = (playerId: number | null) => {
    if (playerId === 1) return iframeUrl ?? null;
    if (playerId === 2) return getPlayer2Url();
    if (playerId === 3) return getPlayer3Url();
    return null;
  };

  const selectedUrl = getPlayerUrl(selectedPlayer);

  const hasFixedStyle =
    !!videoContainerStyle &&
    (videoContainerStyle.height != null || videoContainerStyle.width != null);
  return floatingControls ? (
    <div className={`relative w-full h-full ${className}`}>
      <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-30 flex-col gap-2">
        {[1, 2, 3].map((playerId) => {
          const disabled =
            (playerId === 1 && !player1Available) ||
            (playerId === 2 && !player2Available) ||
            (playerId === 3 && !player3Available);
          const isActive = selectedPlayer === playerId;

          return (
            <button
              key={playerId}
              type="button"
              onClick={() => {
                if (!disabled) handlePlayerSelect(playerId);
              }}
              disabled={disabled}
              className={`relative flex items-center justify-center w-11 h-11 rounded-full border text-[11px] font-semibold transition-all duration-200 ${
                disabled
                  ? "border-white/15 bg-black/40 text-white/30 cursor-not-allowed opacity-60"
                  : isActive
                  ? "bg-white text-black border-white shadow-[0_12px_30px_rgba(0,0,0,0.75)] scale-105"
                  : "bg-black/60 text-white/80 border-white/25 hover:bg-white/10 hover:border-white/50 hover:text-white"
              }`}
            >
              П{playerId}
            </button>
          );
        })}
      </div>
      <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 z-30">
        <Select
          value={selectedPlayer ? String(selectedPlayer) : undefined}
          onValueChange={(val) => handlePlayerSelect(Number(val))}
        >
          <SelectTrigger className="min-w-[150px] w-auto bg-black/60 border-white/20 text-zinc-100 backdrop-blur-md relative z-30 px-3">
            <SelectValue placeholder="Выберите плеер" />
          </SelectTrigger>
          <SelectContent className="z-[150]" position="popper" align="center">
            {[1, 2, 3].map((playerId) => {
              const disabled =
                (playerId === 1 && !player1Available) ||
                (playerId === 2 && !player2Available) ||
                (playerId === 3 && !player3Available);

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
        className={`group relative w-full h-full rounded-xl overflow-hidden ${
          videoContainerClassName || "bg-black"
        } shadow-2xl ring-1 ring-white/10 z-0`}
        style={videoContainerStyle}
      >
        {selectedUrl ? (
          <iframe
            src={selectedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Movie Player"
            style={{ zIndex: 1 }}
          />
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
            {[1, 2, 3].map((playerId) => {
              const disabled =
                (playerId === 1 && !player1Available) ||
                (playerId === 2 && !player2Available) ||
                (playerId === 3 && !player3Available);

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
          <iframe
            src={selectedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Movie Player"
            style={{ zIndex: 1 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500">
            <span className="text-sm">Плеер недоступен</span>
          </div>
        )}
      </div>
    </div>
  );
}

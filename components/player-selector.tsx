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
}

export function PlayerSelector({ onPlayerSelect, onClose, iframeUrl, kpId, className = "", videoContainerClassName = "", videoContainerStyle }: PlayerSelectorProps) {
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
  }, [player2Available, player1Available, player3Available, kpId, iframeUrl, selectedPlayer]);

  const getPlayerUrl = (playerId: number | null) => {
    if (playerId === 1) return iframeUrl ?? null;
    if (playerId === 2) return getPlayer2Url();
    if (playerId === 3) return getPlayer3Url();
    return null;
  };

  const selectedUrl = getPlayerUrl(selectedPlayer);

  const hasFixedStyle = !!videoContainerStyle && (videoContainerStyle.height != null || videoContainerStyle.width != null);
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Player Controls - Top */}
      <div className="mb-4">
        <Select
          value={selectedPlayer ? String(selectedPlayer) : undefined}
          onValueChange={(val) => handlePlayerSelect(Number(val))}
        >
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-white/10 text-zinc-200">
            <SelectValue placeholder="Выберите плеер" />
          </SelectTrigger>
          <SelectContent>
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

      <div className={`group relative w-full ${hasFixedStyle ? "" : "aspect-video"} rounded-xl overflow-hidden ${videoContainerClassName || "bg-black"} shadow-2xl ring-1 ring-white/10 z-0`} style={videoContainerStyle}>
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
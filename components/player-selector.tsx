"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PlayerSelectorProps {
  onPlayerSelect?: (playerId: number) => void;
  iframeUrl?: string;
  kpId?: string;
  className?: string;
}

export function PlayerSelector({ onPlayerSelect, iframeUrl, kpId, className = "" }: PlayerSelectorProps) {
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

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-2 justify-end">
        {[1, 2, 3].map((playerId) => {
          const isActive = selectedPlayer === playerId;
          const disabled =
            (playerId === 1 && !player1Available) ||
            (playerId === 2 && !player2Available) ||
            (playerId === 3 && !player3Available);
          return (
            <Button
              key={playerId}
              variant="ghost"
              size="sm"
              onClick={() => handlePlayerSelect(playerId)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium text-white border border-transparent shadow-xs ring-1 ring-white/10 hover:shadow-md hover:opacity-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={
                isActive
                  ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                  : {
                      backgroundImage:
                        "linear-gradient(90deg, rgba(var(--poster-accent-tl-rgb), 0.7), rgba(var(--poster-accent-br-rgb), 0.7))",
                    }
              }
              disabled={disabled}
              aria-current={isActive}
            >
              Плеер {playerId}
            </Button>
          );
        })}
      </div>
      <div className="group relative w-full aspect-video bg-transparent rounded-lg overflow-hidden">
        {selectedUrl ? (
          <iframe
            src={selectedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Movie Player"
          />
        ) : null}
        {selectedUrl && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-12 md:h-16 z-10"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.25), rgba(0,0,0,0))",
            }}
          />
        )}
      </div>
    </div>
  );
}
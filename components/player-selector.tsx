"use client";

import { useState } from "react";
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



  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-zinc-300">Выбор плеера</h3>
      <div className="flex gap-2">
        {[1, 2, 3].map((playerId) => (
          <Button
            key={playerId}
            variant={selectedPlayer === playerId ? "default" : "outline"}
            size="sm"
            onClick={() => handlePlayerSelect(playerId)}
            className={`
              text-xs px-3 py-1.5 h-auto transition-all duration-200 border-0
              ${
                selectedPlayer === playerId
                  ? "text-white hover:opacity-95"
                  : "bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-600"
              }
            `}
            style={
          selectedPlayer === playerId
            ? {
                backgroundImage:
                  "linear-gradient(90deg, rgba(var(--poster-accent-tl-rgb), 0.7), rgba(var(--poster-accent-br-rgb), 0.7))",
              }
            : {}
        }
          >
            Плеер {playerId}
          </Button>
        ))}
      </div>
      
      {/* Отображение iframe при выборе плеера 1 */}
      {selectedPlayer === 1 && iframeUrl && (
        <div className="mt-4">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={iframeUrl}
              className="w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title="Movie Player 1"
            />
          </div>
        </div>
      )}

      {/* Отображение iframe при выборе плеера 2 */}
      {selectedPlayer === 2 && getPlayer2Url() && (
        <div className="mt-4">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={getPlayer2Url()!}
              className="w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title="Movie Player 2"
            />
          </div>
        </div>
      )}

      {/* Отображение iframe при выборе плеера 3 */}
      {selectedPlayer === 3 && getPlayer3Url() && (
        <div className="mt-4">
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={getPlayer3Url()!}
              className="w-full h-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title="Movie Player 3"
            />
          </div>
        </div>
      )}


    </div>
  );
}
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

  // Доступность плееров
  const player1Available = Boolean(iframeUrl);
  const player2Available = Boolean(kpId);
  const player3Available = Boolean(kpId);

  const getPlayerUrl = (playerId: number | null) => {
    if (playerId === 1) return iframeUrl ?? null;
    if (playerId === 2) return getPlayer2Url();
    if (playerId === 3) return getPlayer3Url();
    return null;
  };

  const selectedUrl = getPlayerUrl(selectedPlayer);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="group relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        {selectedUrl ? (
          <iframe
            src={selectedUrl}
            className="w-full h-full border-0"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Movie Player"
          />
        ) : null}

        {/* До выбора: центрированный прозрачный оверлей с меткой "Выберите источник" и кнопками */}
        {!selectedUrl && (
          <div className="absolute inset-0 z-10 p-2 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm md:text-base text-white/90">
                Выберите источник
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[1, 2, 3].map((playerId) => (
                  <Button
                    key={playerId}
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayerSelect(playerId)}
                    className="pointer-events-auto text-xs px-3 py-1.5 h-auto transition-all duration-200 border-0 text-white bg-zinc-800/60 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, rgba(var(--poster-accent-tl-rgb), 0.7), rgba(var(--poster-accent-br-rgb), 0.7))",
                    }}
                    disabled={
                      (playerId === 1 && !player1Available) ||
                      (playerId === 2 && !player2Available) ||
                      (playerId === 3 && !player3Available)
                    }
                  >
                    Плеер {playerId}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* После выбора: кнопки под iframe, вне фрейма, выравнены слева */}
      {selectedUrl && (
        <div className="flex flex-wrap gap-2 justify-start">
          {[1, 2, 3].map((playerId) => (
            <Button
              key={playerId}
              variant="ghost"
              size="sm"
              onClick={() => handlePlayerSelect(playerId)}
              className="text-xs px-3 py-1.5 h-auto transition-all duration-200 border-0 text-white bg-zinc-800/60 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, rgba(var(--poster-accent-tl-rgb), 0.7), rgba(var(--poster-accent-br-rgb), 0.7))",
              }}
              disabled={
                (playerId === 1 && !player1Available) ||
                (playerId === 2 && !player2Available) ||
                (playerId === 3 && !player3Available)
              }
            >
              Плеер {playerId}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
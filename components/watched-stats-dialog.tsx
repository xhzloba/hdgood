"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Activity, Clock, Film, Tv, Medal, Globe, Star } from "lucide-react";
import { WatchedMovie } from "@/hooks/use-watched";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";

interface WatchedStatsDialogProps {
  watched: WatchedMovie[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WatchedStatsDialog({ watched, open, onOpenChange }: WatchedStatsDialogProps) {
  const stats = useMemo(() => {
    let totalMinutes = 0;
    const genreCounts: Record<string, number> = {};
    const countryCounts: Record<string, number> = {};
    let moviesCount = 0;
    let serialsCount = 0;

    watched.forEach((movie) => {
      // Count types
      const type = String(movie.type || "").toLowerCase();
      if (
        type.includes("serial") ||
        type.includes("series") ||
        type.includes("tv") ||
        type.includes("show") ||
        type.includes("сериал")
      ) {
        serialsCount++;
      } else {
        moviesCount++;
      }

      // Parse duration
      if (movie.duration) {
        const dur = String(movie.duration).toLowerCase();
        let minutes = 0;
        const hoursMatch = dur.match(/(\d+)\s*ч/);
        const minMatch = dur.match(/(\d+)\s*м/);
        
        if (hoursMatch) minutes += parseInt(hoursMatch[1]) * 60;
        if (minMatch) minutes += parseInt(minMatch[1]);
        if (!hoursMatch && !minMatch && /^\d+$/.test(dur)) {
            minutes += parseInt(dur);
        }
        totalMinutes += minutes;
      }

      // Genres
      let genres: string[] = [];
      if (Array.isArray(movie.genre)) {
        genres = movie.genre.map(String);
      } else if (typeof movie.genre === "string") {
        genres = movie.genre.split(",").map((g) => g.trim());
      }
      genres.forEach((g) => {
        if (g) genreCounts[g] = (genreCounts[g] || 0) + 1;
      });

      // Countries
      let countries: string[] = [];
      if (Array.isArray(movie.country)) {
        countries = movie.country.map(String);
      } else if (typeof movie.country === "string") {
        countries = movie.country.split(",").map((c) => c.trim());
      }
      countries.forEach((c) => {
        if (c) countryCounts[c] = (countryCounts[c] || 0) + 1;
      });
    });

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ 
        name, 
        value, 
        percent: watched.length > 0 ? (value / watched.length) * 100 : 0 
      }));

    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ 
        name, 
        value,
        percent: watched.length > 0 ? (value / watched.length) * 100 : 0 
      }));

    const topRatedMovies = watched
      .map((m) => {
        const r = typeof m.rating === "string" ? parseFloat(m.rating) : m.rating;
        return { ...m, numericRating: isNaN(r) ? 0 : r };
      })
      .filter((m) => m.numericRating > 0)
      .sort((a, b) => b.numericRating - a.numericRating)
      .slice(0, 5);

    return {
      totalMinutes,
      moviesCount,
      serialsCount,
      topGenres,
      topCountries,
      topRatedMovies,
    };
  }, [watched]);

  const formatDuration = (minutes: number) => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) return `${days}д ${hours}ч ${mins}м`;
    if (hours > 0) return `${hours}ч ${mins}м`;
    return `${mins} мин`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl gap-0">
        <DialogHeader className="p-6 pb-4 bg-zinc-900/30 border-b border-white/5">
          <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Статистика просмотра
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-8">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center gap-2">
              <Clock className="w-5 h-5 text-blue-400 mb-1" />
              <div className="text-xl md:text-2xl font-black tracking-tight text-white">
                {formatDuration(stats.totalMinutes)}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                Время
              </div>
            </div>

            <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center gap-2">
              <Film className="w-5 h-5 text-purple-400 mb-1" />
              <div className="text-2xl font-black tracking-tight text-white">
                {stats.moviesCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                Фильмы
              </div>
            </div>

            <div className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center gap-2">
              <Tv className="w-5 h-5 text-emerald-400 mb-1" />
              <div className="text-2xl font-black tracking-tight text-white">
                {stats.serialsCount}
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                Сериалы
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Top Genres */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Medal className="w-3 h-3" /> Топ жанров
              </h4>
              <div className="space-y-3">
                {stats.topGenres.map((g) => (
                  <div key={g.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-zinc-200">{g.name}</span>
                      <span className="text-zinc-400">{g.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(g.percent * 2, 100)}%` }} // Boost visual length
                      />
                    </div>
                  </div>
                ))}
                {stats.topGenres.length === 0 && (
                  <p className="text-sm text-zinc-600 italic">Нет данных</p>
                )}
              </div>
            </div>

            {/* Top Countries */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3 h-3" /> Топ стран
              </h4>
              <div className="space-y-3">
                {stats.topCountries.map((c) => (
                  <div key={c.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-zinc-200">{c.name}</span>
                      <span className="text-zinc-400">{c.value}</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(c.percent * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {stats.topCountries.length === 0 && (
                  <p className="text-sm text-zinc-600 italic">Нет данных</p>
                )}
              </div>
            </div>
          </div>

          {/* Top Rated Movies */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Star className="w-3 h-3" /> Топ по рейтингу
            </h4>
            <div className="space-y-2">
              {stats.topRatedMovies.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 bg-zinc-900/20 p-2 rounded-lg border border-white/5">
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-200 truncate">{m.title}</div>
                  </div>
                  <div className={`text-xs font-bold px-1.5 py-0.5 rounded ${ratingBgColor(m.numericRating)} text-white`}>
                    {formatRatingLabel(m.numericRating)}
                  </div>
                </div>
              ))}
              {stats.topRatedMovies.length === 0 && (
                <p className="text-sm text-zinc-600 italic">Нет данных с рейтингом</p>
              )}
            </div>
          </div>
          
          {/* Fun Fact */}
          {stats.totalMinutes > 0 && (
             <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                <p className="text-xs text-blue-200 leading-relaxed">
                   <span className="font-bold block mb-1">Знаете ли вы?</span>
                   За это время вы могли бы посмотреть «Титаник» {(stats.totalMinutes / 195).toFixed(1)} раз(а) или слетать на Луну {(stats.totalMinutes / (24 * 60 * 3) * 0.1).toFixed(2)} раз(а)! 🚀
                </p>
             </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

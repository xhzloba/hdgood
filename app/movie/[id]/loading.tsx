import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function Loading() {
  return (
    <div className="min-h-[100dvh] min-h-screen relative bg-zinc-950 safe-top safe-bottom">
      {/* Background overlay */}
      <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-3xl -z-10" />

      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Назад
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 relative z-0">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Poster Skeleton */}
          <div className="space-y-4 md:sticky md:top-20 md:self-start">
            <div
              className="aspect-[2/3] bg-zinc-900 rounded overflow-hidden"
              style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.28)" }}
            >
              <Skeleton className="w-full h-full" />
            </div>
            <Skeleton className="w-full h-12 rounded" />
          </div>

          {/* Info Skeleton */}
          <div className="space-y-6">
            <div>
              <Skeleton className="h-9 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            {/* Ratings */}
            <div className="grid md:grid-cols-2 gap-16">
              <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-6 rounded" />
                <Skeleton className="w-16 h-6 rounded" />
              </div>
              <div className="md:pl-8">
                <Skeleton className="w-24 h-12 rounded" />
              </div>
            </div>

            {/* Meta + Cast */}
            <div className="grid md:grid-cols-2 gap-16">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32 mb-4" />
                {Array.from({ length: 15 }).map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
              <div className="space-y-2 md:pl-8">
                <Skeleton className="h-6 w-24 mb-4" />
                {Array.from({ length: 11 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>

            {/* Trailer */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="aspect-video w-full rounded" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>

            {/* Actor cards */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-24" />
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-zinc-900/60 border border-zinc-800/50 rounded-sm overflow-hidden"
                  >
                    <Skeleton className="aspect-[2/3] w-full" />
                    <div className="p-2">
                      <Skeleton className="h-3 w-full mb-1" />
                      <Skeleton className="h-2 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react"
import { createPortal } from "react-dom"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ShootingPhotosSliderProps {
  photos: string[]
}

export function ShootingPhotosSlider({ photos }: ShootingPhotosSliderProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  React.useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [selectedIndex]);

  // Keyboard navigation
  React.useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, photos.length]);

  if (!photos || photos.length === 0) return null

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-2xl font-semibold text-white">Кадры</h3>
      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: true,
        }}
        className="w-full relative group"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {photos.map((photo, index) => (
            <CarouselItem key={index} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/3 xl:basis-1/4">
              <div 
                className="aspect-video relative rounded-lg overflow-hidden bg-zinc-900 border border-white/10 cursor-pointer group/item"
                onClick={() => setSelectedIndex(index)}
              >
                <img
                  src={photo}
                  alt={`Кадр ${index + 1}`}
                  loading="lazy"
                  className="object-cover w-full h-full group-hover/item:scale-105 transition-transform duration-500"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0" />
        <CarouselNext className="right-4 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0" />
      </Carousel>

      {/* Lightbox via Portal */}
      {mounted && selectedIndex !== null && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          style={{ height: '100dvh', width: '100vw' }}
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close button */}
          <button 
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[100000]"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(null);
            }}
            aria-label="Закрыть"
          >
            <X size={24} />
          </button>

          {/* Navigation buttons */}
          {selectedIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[100000] hidden md:block"
              onClick={handlePrev}
              aria-label="Предыдущее"
            >
              <ChevronLeft size={32} />
            </button>
          )}
          
          {selectedIndex < photos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[100000] hidden md:block"
              onClick={handleNext}
              aria-label="Следующее"
            >
              <ChevronRight size={32} />
            </button>
          )}
          
          {/* Image container */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Clickable areas for mobile navigation (left/right 20% of screen) */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-[20%] z-[99999] md:hidden" 
              onClick={handlePrev} 
            />
            <div 
              className="absolute right-0 top-0 bottom-0 w-[20%] z-[99999] md:hidden" 
              onClick={handleNext} 
            />

            <img 
              src={photos[selectedIndex]} 
              alt={`Кадр ${selectedIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded shadow-2xl select-none"
              style={{ maxHeight: '90dvh', maxWidth: '95vw' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium select-none bg-black/50 px-3 py-1 rounded-full">
            {selectedIndex + 1} / {photos.length}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

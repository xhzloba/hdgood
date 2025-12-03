'use client'

import * as React from 'react'
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from 'embla-carousel-react'

import { cn } from '@/lib/utils'

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: 'horizontal' | 'vertical'
  setApi?: (api: CarouselApi) => void
  enableGlobalKeyNavigation?: boolean
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />')
  }

  return context
}

function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  enableGlobalKeyNavigation = false,
  ...props
}: React.ComponentProps<'div'> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === 'horizontal' ? 'x' : 'y',
    },
    plugins,
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isKeyboardRef = React.useRef(false)

  const disableKeyboardMode = React.useCallback(() => {
    if (containerRef.current) {
      delete containerRef.current.dataset.keyboardNav
    }
  }, [])

  const enableKeyboardMode = React.useCallback(() => {
    if (containerRef.current) {
      containerRef.current.dataset.keyboardNav = 'true'
    }
  }, [])

  React.useEffect(() => {
    const handleMouseMove = () => {
      disableKeyboardMode()
    }
    const handleMouseDown = () => {
      disableKeyboardMode()
    }
    // Add listeners to window to catch any mouse movement/click
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [disableKeyboardMode])

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev()
  }, [api])

  const scrollNext = React.useCallback(() => {
    api?.scrollNext()
  }, [api])

  // Global keyboard navigation
  React.useEffect(() => {
    if (!enableGlobalKeyNavigation || !api) return

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      
      // Check if focus is already inside the carousel
      const isFocusInside = containerRef.current?.contains(document.activeElement)
      if (isFocusInside) return

      if (event.key === 'ArrowLeft') {
        enableKeyboardMode()
        event.preventDefault()
        const idx = api.selectedScrollSnap()
        const slides = api.slideNodes()
        const targetIdx = idx - 1
        
        if (targetIdx >= 0) {
           const slide = slides[targetIdx]
           const link = slide.querySelector('a, button') as HTMLElement
           if (link) link.focus()
           api.scrollTo(targetIdx)
        } else {
           // First slide
           const slide = slides[0]
           const link = slide.querySelector('a, button') as HTMLElement
           if (link) link.focus()
           scrollPrev()
        }
      } else if (event.key === 'ArrowRight') {
        enableKeyboardMode()
        event.preventDefault()
        const idx = api.selectedScrollSnap()
        const slides = api.slideNodes()
        const targetIdx = idx + 1
        
        if (targetIdx < slides.length) {
           const slide = slides[targetIdx]
           const link = slide.querySelector('a, button') as HTMLElement
           if (link) link.focus()
           api.scrollTo(targetIdx)
        } else {
           // Last slide or loop
           const slide = slides[idx]
           const link = slide.querySelector('a, button') as HTMLElement
           if (link) link.focus()
           scrollNext()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [api, enableGlobalKeyNavigation, scrollPrev, scrollNext, enableKeyboardMode])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!api) return
      
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        isKeyboardRef.current = true
        enableKeyboardMode()
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        // Находим текущий активный элемент внутри карусели
        const activeElement = document.activeElement as HTMLElement;
        const currentSlide = activeElement?.closest('[data-slot="carousel-item"]');
        
        if (currentSlide) {
          // Если фокус уже внутри, перемещаем его на предыдущий слайд
          const previousSlide = currentSlide.previousElementSibling as HTMLElement;
          if (previousSlide) {
             const link = previousSlide.querySelector('a, button') as HTMLElement;
             if (link) link.focus();
          } else {
             // Если это первый слайд, скроллим карусель назад
             scrollPrev();
          }
        } else {
          // Если фокус не внутри, просто скроллим
          scrollPrev();
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        // Находим текущий активный элемент внутри карусели
        const activeElement = document.activeElement as HTMLElement;
        const currentSlide = activeElement?.closest('[data-slot="carousel-item"]');
        
        if (currentSlide) {
           // Если фокус уже внутри, перемещаем его на следующий слайд
           const nextSlide = currentSlide.nextElementSibling as HTMLElement;
           if (nextSlide) {
              const link = nextSlide.querySelector('a, button') as HTMLElement;
              if (link) link.focus();
           } else {
              // Если это последний видимый слайд, скроллим карусель вперед
              scrollNext();
           }
        } else {
           // Если фокус не внутри, просто скроллим
           scrollNext();
        }
      }
    },
    [api, scrollPrev, scrollNext, enableKeyboardMode],
  )

  const handleFocusCapture = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!api) return
      const slide = (event.target as HTMLElement).closest(
        '[data-slot="carousel-item"]'
      )
      if (slide && slide.parentElement) {
        const slides = Array.from(slide.parentElement.children)
        const index = slides.indexOf(slide)
        if (index >= 0) {
           // Check if the slide is already visible
           // If it is, we don't want to scroll, especially on click (which triggers focus)
           // But we DO want to scroll if it was triggered by keyboard navigation
           if (!isKeyboardRef.current && api.slidesInView().includes(index)) {
             return
           }
           
           api.scrollTo(index)
           // Reset flag
           isKeyboardRef.current = false
        }
      }
    },
    [api]
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on('reInit', onSelect)
    api.on('select', onSelect)

    return () => {
      api?.off('select', onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        ref={containerRef}
        onKeyDownCapture={handleKeyDown}
        onFocusCapture={handleFocusCapture}
        className={cn('relative', className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<'div'>) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      className="overflow-hidden"
      data-slot="carousel-content"
    >
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
          className,
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<'div'>) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className,
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <button
      data-slot="carousel-previous"
      className={cn(
        'absolute z-20 inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full border border-white/70 bg-white text-black shadow-md hover:shadow-lg hover:bg-white/95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        orientation === 'horizontal'
          ? 'top-1/2 left-0 -translate-y-1/2 md:-translate-x-1/2'
          : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'currentColor' }} className="w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-7 xl:h-7">
        <path d="M15 6l-6 6l6 6"></path>
      </svg>
      <span className="sr-only">Previous slide</span>
    </button>
  )
}

function CarouselNext({
  className,
  ...props
}: React.ComponentProps<'button'>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <button
      data-slot="carousel-next"
      className={cn(
        'absolute z-20 inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full border border-white/70 bg-white text-black shadow-md hover:shadow-lg hover:bg-white/95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
        orientation === 'horizontal'
          ? 'top-1/2 right-0 -translate-y-1/2 md:translate-x-1/2'
          : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ color: 'currentColor' }} className="w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-7 xl:h-7">
        <path d="M9 6l6 6l-6 6"></path>
      </svg>
      <span className="sr-only">Next slide</span>
    </button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}

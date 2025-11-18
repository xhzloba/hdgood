/**
 * Утилита для анимации перехода постера фильма
 * от позиции в слайдере/гриде к позиции в детальной странице
 * (только для десктопа)
 */

export interface PosterTransitionData {
  movieId: string;
  posterUrl: string;
  rect: DOMRect;
  timestamp: number;
}

const TRANSITION_KEY = 'poster-transition-data';
const TRANSITION_DURATION = 600; // ms
const TRANSITION_MAX_AGE = 2000; // ms - максимальное время жизни данных перехода

/**
 * Сохраняет данные о позиции постера для анимации перехода
 */
export function savePosterTransition(data: Omit<PosterTransitionData, 'timestamp'>) {
  // Проверяем что это десктоп (ширина >= 768px)
  if (typeof window === 'undefined' || window.innerWidth < 768) {
    return;
  }

  const transitionData: PosterTransitionData = {
    ...data,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(TRANSITION_KEY, JSON.stringify(transitionData));
  } catch (e) {
    console.warn('Failed to save poster transition data:', e);
  }
}

/**
 * Получает и удаляет данные о переходе постера
 */
export function getPosterTransition(movieId: string): PosterTransitionData | null {
  if (typeof window === 'undefined' || window.innerWidth < 768) {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(TRANSITION_KEY);
    if (!stored) return null;

    const data: PosterTransitionData = JSON.parse(stored);

    // Проверяем что данные свежие и для нужного фильма
    if (
      data.movieId !== movieId ||
      Date.now() - data.timestamp > TRANSITION_MAX_AGE
    ) {
      sessionStorage.removeItem(TRANSITION_KEY);
      return null;
    }

    // Удаляем данные после использования
    sessionStorage.removeItem(TRANSITION_KEY);
    return data;
  } catch (e) {
    console.warn('Failed to get poster transition data:', e);
    return null;
  }
}

/**
 * Анимирует переход постера от исходной позиции к целевой
 */
export function animatePosterTransition(
  sourceRect: DOMRect,
  targetElement: HTMLElement,
  posterUrl: string,
  onComplete?: () => void
) {
  if (typeof window === 'undefined' || window.innerWidth < 768) {
    onComplete?.();
    return;
  }

  const targetRect = targetElement.getBoundingClientRect();

  // Создаём клон постера для анимации
  const clone = document.createElement('div');
  clone.style.position = 'fixed';
  clone.style.top = `${sourceRect.top}px`;
  clone.style.left = `${sourceRect.left}px`;
  clone.style.width = `${sourceRect.width}px`;
  clone.style.height = `${sourceRect.height}px`;
  clone.style.zIndex = '9999';
  clone.style.pointerEvents = 'none';
  clone.style.borderRadius = '10px';
  clone.style.overflow = 'hidden';
  clone.style.transition = `all ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`;

  // Добавляем изображение
  const img = document.createElement('img');
  img.src = posterUrl;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  clone.appendChild(img);

  // Скрываем целевой элемент на время анимации
  targetElement.style.opacity = '0';

  document.body.appendChild(clone);

  // Запускаем анимацию на следующем фрейме
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clone.style.top = `${targetRect.top}px`;
      clone.style.left = `${targetRect.left}px`;
      clone.style.width = `${targetRect.width}px`;
      clone.style.height = `${targetRect.height}px`;
    });
  });

  // Удаляем клон и показываем целевой элемент после завершения
  setTimeout(() => {
    targetElement.style.opacity = '1';
    targetElement.style.transition = 'opacity 200ms ease-in';
    clone.remove();
    onComplete?.();
  }, TRANSITION_DURATION);
}

/**
 * Очищает данные о переходе (например, при размонтировании)
 */
export function clearPosterTransition() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(TRANSITION_KEY);
  } catch (e) {
    // ignore
  }
}


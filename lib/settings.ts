export const APP_SETTINGS = {
  backdrop: {
    showOnlyTopTrendingMovie: true,
    topTrendingCount: 1,
    rotationIntervalSeconds: 10,
  },
  slider: {
    trending: {
      autoplay: true,
      intervalSeconds: 10,
      perPage: 15,
      hoverPause: true,
      loop: false,
      syncWithBackdrop: false,
    },
  },
  mobile: {
    disableBackdropImage: true,
    hideLogo: true,
    contentOffsetVh: 4,
  },
} as const;

export type AppSettings = typeof APP_SETTINGS;

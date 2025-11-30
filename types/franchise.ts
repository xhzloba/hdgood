export interface FranchiseEpisode {
  episode: number;
  name?: string;
  release_ru?: string;
  iframe_url?: string;
}

export interface FranchiseSeason {
  season: number;
  episodes?: FranchiseEpisode[];
}

export interface FranchiseData {
  id?: string | number;
  kinopoisk_id?: string | number;
  slogan?: string;
  budget?: string;
  fees_world?: string;
  fees_rus?: string;
  premier_rus?: string;
  rate_mpaa?: string;
  screenwriter?: string[];
  operator?: string[];
  design?: string[];
  voiceActing?: string[];
  iframe_url?: string;
  seasons?: FranchiseSeason[];
  [key: string]: any; // Allow other properties for flexibility
}

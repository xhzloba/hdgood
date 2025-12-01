export interface FranchiseEpisode {
  episode: number;
  name?: string;
  release_ru?: string;
  release_world?: string;
  availability?: string;
  iframe_url?: string;
  iframe_poster?: string | null;
  voiceActing?: string[];
  subtitle?: string[];
  ads?: boolean;
}

export interface FranchiseSeason {
  season: number;
  poster?: string;
  release_ru?: string;
  release_world?: string;
  availability?: string;
  iframe_url?: string;
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
  actors_dubl?: string[];
  editor?: string[];
  producer?: string[];
  voiceActing?: string[];
  iframe_url?: string;
  seasons?: FranchiseSeason[];
  parts?: any[]; // Adding parts as user mentioned it
  shooting_photos?: string[];
  trivia?: any[] | string;
  facts?: any[] | string;
  [key: string]: any; // Allow other properties for flexibility
}

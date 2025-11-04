interface TimelineResponse {
  webplayer: boolean;
  id: number;
  user_id: number;
  profile_id: number;
  content_id: string;
  kp_id: number;
  season: number | null;
  episode: number | null;
  current: string;
  time: string;
  created_at: string;
  updated_at: string;
}

export async function getKpIdFromTimeline(
  movieId: string
): Promise<number | null> {
  try {
    const timelineUrl = `https://api.vokino.tv/v2/timeline/watch?ident=${movieId}&current=100&time=100&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352`;
    console.log("Запрос к timeline:", timelineUrl);

    const response = await fetch(timelineUrl);
    const data: TimelineResponse = await response.json();
    console.log("Ответ timeline:", data);

    return data.kp_id || null;
  } catch (error) {
    console.error("Ошибка при получении kp_id из timeline:", error);
    return null;
  }
}

export async function getFranchiseDetails(kpId: number): Promise<any> {
  try {
    // Используем наш Next.js API route для избежания CORS проблем
    const detailsUrl = `/api/franchise?kinopoisk_id=${kpId}`;
    console.log("Запрос к franchise/details:", detailsUrl);

    const response = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Результат franchise/details:", data);

    return data;
  } catch (error) {
    console.error("Ошибка при получении franchise/details:", error);
    return null;
  }
}

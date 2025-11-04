import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const kpId = searchParams.get('kinopoisk_id');
  
  if (!kpId) {
    return NextResponse.json(
      { error: 'kinopoisk_id parameter is required' },
      { status: 400 }
    );
  }

  try {
    const franchiseUrl = `https://api.bhcesh.me/franchise/details?token=eedefb541aeba871dcfc756e6b31c02e&kinopoisk_id=${kpId}`;
    
    const response = await fetch(franchiseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; HDGood/1.0)',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️ Franchise API HTTP error: ${response.status} для kp_id: ${kpId}`);
      return NextResponse.json(
        { error: `Franchise API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Проверяем что данные не пустые
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      console.warn(`⚠️ Franchise API вернул пустой объект для kp_id: ${kpId}`);
      return NextResponse.json(null);
    }

    // Возвращаем данные с правильными CORS заголовками
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
        'Cache-Control': 'public, max-age=300', // Кешируем на 5 минут
      },
    });
  } catch (error) {
    console.error(`⚠️ Franchise API error для kp_id: ${kpId}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Обработка preflight запросов
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    },
  });
}
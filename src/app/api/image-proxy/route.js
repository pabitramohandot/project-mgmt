import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return new Response('Missing url parameter', { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin;
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('data:')) {
      targetUrl = new URL(targetUrl, origin).toString();
    }

    const res = await fetch(targetUrl);
    if (!res.ok) {
      return new Response('Failed to fetch image', { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

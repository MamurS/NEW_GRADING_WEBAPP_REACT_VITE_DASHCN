import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE_URL = 'https://176.97.67.69';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: NextRequest) {
  // Get the path from the request URL
  const path = request.nextUrl.pathname.replace('/api/proxy', '');
  
  // Get the full URL for the backend
  const url = new URL(path, API_BASE_URL);
  
  // Copy query parameters
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  try {
    // Forward the request to the backend
    const response = await fetch(url.toString(), {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: request.method !== 'GET' ? await request.text() : undefined,
    });

    // Get the response data
    const data = await response.text();

    // Create a new response with the data
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': 'https://new-grading-webapp-react-vite-dashcn.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://new-grading-webapp-react-vite-dashcn.vercel.app',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      },
    });
  }
} 
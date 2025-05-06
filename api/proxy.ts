import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_BASE_URL = 'https://176.97.67.69';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get the path from the request URL
  const path = req.url?.replace('/api/proxy', '') || '';
  
  // Get the full URL for the backend
  const url = new URL(path, API_BASE_URL);
  
  // Copy query parameters
  if (req.query) {
    Object.entries(req.query).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value.toString());
      }
    });
  }

  try {
    // Forward the request to the backend
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    // Get the response data
    const data = await response.text();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', 'https://new-grading-webapp-react-vite-dashcn.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Send the response
    res.status(response.status).send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy error' });
  }
} 
// Next.js API route to proxy /api/v1/users/profile to backend
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Forward cookies for authentication
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  const apiUrl = `${backendUrl}/api/v1/users/profile`;

  try {
    // Forward Authorization header and cookies for authentication
    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }
    if (req.headers.cookie) {
      headers['Cookie'] = req.headers.cookie as string;
    }
    const apiRes = await fetch(apiUrl, {
      method: req.method,
      headers,
      credentials: 'include',
    });
    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', details: err instanceof Error ? err.message : err });
  }
}

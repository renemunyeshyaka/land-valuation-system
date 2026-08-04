import { NextApiRequest, NextApiResponse } from "next";

/**
 * NextAuth stub — replaced with a minimal session API.
 *
 * next-auth v4 (next-auth@4.24.5) is incompatible with Next.js 16 (the async
 * cookies()/headers() change) and returns HTTP 500 on /api/auth/session.
 * Real authentication in this app is handled by the Go backend (JWT stored in
 * localStorage under `access_token`); NextAuth is NOT used for auth, so we
 * serve a harmless session endpoint here instead of crashing.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = req.query.nextauth;
  const action = Array.isArray(parts) ? parts[0] : undefined;

  if (req.method === "GET") {
    switch (action) {
      case "session":
        return res.status(200).json({ user: null, expires: new Date(0).toISOString() });
      case "csrf":
        return res.status(200).json({ csrfToken: "" });
      case "providers":
        return res.status(200).json({});
      default:
        return res.status(200).json({});
    }
  }

  if (req.method === "POST" && action === "signout") {
    return res.status(200).json({ url: "/" });
  }

  return res.status(200).json({});
}

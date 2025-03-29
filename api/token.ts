import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Log the entire request for debugging
  console.log('Incoming request:', {
    method: req.method,
    body: req.body,
    headers: req.headers,
  });

  // Ensure the request method is POST
  if (req.method !== 'POST') {
    console.error('Invalid request method:', req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    console.error('Missing code or redirectUri:', { code, redirectUri });
    return res.status(400).json({ error: 'Missing code or redirectUri' });
  }

  // Log environment variables for debugging
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const serverRedirectUri = process.env.SPOTIFY_REDIRECT_URI;

  console.log('Environment variables:', {
    SPOTIFY_CLIENT_ID: clientId,
    SPOTIFY_CLIENT_SECRET: clientSecret ? '[REDACTED]' : undefined, // Avoid logging sensitive data
    SPOTIFY_REDIRECT_URI: serverRedirectUri,
  });

  if (!clientId || !clientSecret || !serverRedirectUri) {
    console.error('Missing environment variables:', {
      clientId,
      clientSecret: clientSecret ? '[REDACTED]' : undefined,
      redirectUri: serverRedirectUri,
    });
    return res.status(500).json({ error: 'Server configuration error: Missing environment variables' });
  }

  // Log the request parameters being sent to Spotify
  const requestParams = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  };
  console.log('Sending token exchange request to Spotify with params:', {
    ...requestParams,
    client_secret: '[REDACTED]', // Avoid logging sensitive data
  });

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams(requestParams),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    console.log('Token exchange successful:', response.data);
    return res.status(200).json({ access_token: response.data.access_token });
  } catch (error: any) {
    console.error('Token exchange failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    return res.status(500).json({
      error: 'Failed to exchange token',
      details: error.response?.data || error.message,
    });
  }
};

export default handler;

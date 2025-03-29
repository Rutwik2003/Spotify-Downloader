import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

// Use ES module export syntax
const handler = async (req: VercelRequest, res: VercelResponse) => {
  // Log the request body for debugging
  console.log('Request body:', req.body);

  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    console.error('Missing code or redirectUri:', { code, redirectUri });
    return res.status(400).json({ error: 'Missing code or redirectUri' });
  }

  // Log environment variables for debugging
  console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID);
  console.log('SPOTIFY_CLIENT_SECRET:', process.env.SPOTIFY_CLIENT_SECRET);
  console.log('SPOTIFY_REDIRECT_URI:', process.env.SPOTIFY_REDIRECT_URI);

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REDIRECT_URI) {
    console.error('Missing environment variables:', {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI,
    });
    return res.status(500).json({ error: 'Server configuration error: Missing environment variables' });
  }

  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    console.log('Token exchange successful:', response.data);
    return res.status(200).json({ access_token: response.data.access_token });
  } catch (error: any) {
    console.error('Token exchange failed:', error.message, error.response?.data);
    return res.status(500).json({ error: 'Failed to exchange token', details: error.response?.data || error.message });
  }
};

// Export as an ES module
export default handler;
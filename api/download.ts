import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytDlp from 'yt-dlp-exec';
import { promises as fs } from 'fs';
import { join } from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body; // e.g., "Blinding Lights The Weeknd"

  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    // Temporary file path to store the downloaded MP3
    const tempDir = '/tmp'; // Vercel provides a writable /tmp directory
    const filename = `${query.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
    const filePath = join(tempDir, filename);

    // Use yt-dlp to search for the track on YouTube and download it as MP3
    await ytDlp.execPromise([
      `ytsearch1:${query}`, // Search for the track on YouTube
      '-x', // Extract audio
      '--audio-format', 'mp3', // Convert to MP3
      '-o', filePath, // Output file path
      '--no-playlist', // Ensure we only download one result
    ]);

    // Read the file into a buffer
    const fileBuffer = await fs.readFile(filePath);

    // Save the file to Vercel Blob Storage (or another storage solution)
    // For simplicity, we'll return a hypothetical URL
    // In a real app, you'd upload this to Vercel Blob Storage or S3
    const downloadUrl = `https://your-storage-service.com/files/${filename}`; // Replace with real storage URL

    // Clean up the temporary file
    await fs.unlink(filePath);

    return res.status(200).json({ url: downloadUrl });
  } catch (error: any) {
    console.error('Error downloading track:', error.message);
    return res.status(500).json({ error: 'Failed to download track', details: error.message });
  }
}
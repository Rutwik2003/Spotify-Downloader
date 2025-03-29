import type { VercelRequest, VercelResponse } from '@vercel/node';
import ytDlp from 'yt-dlp-exec';
import AdmZip from 'adm-zip';
import { put } from '@vercel/blob';
import { promises as fs } from 'fs';
import { join } from 'path';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const downloadTrackWithRetry = async (query: string, retries = 3, backoff = 1000) => {
  const tempDir = '/tmp';
  const filename = `${query.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
  const filePath = join(tempDir, filename);

  for (let i = 0; i < retries; i++) {
    try {
      await ytDlp.execPromise([
        `ytsearch1:${query}`,
        '-x',
        '--audio-format', 'mp3',
        '-o', filePath,
        '--no-playlist',
      ]);

      const fileBuffer = await fs.readFile(filePath);
      await fs.unlink(filePath); // Clean up
      return fileBuffer;
    } catch (error: any) {
      if (i < retries - 1) {
        const waitTime = backoff * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${retries} after ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { tracks } = req.body;

  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid tracks parameter' });
  }

  try {
    const zip = new AdmZip();

    // Download each track and add it to the ZIP file
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const query = `${track.name} ${track.artist}`;
      console.log(`Downloading track ${i + 1}/${tracks.length}: ${query}`);

      const trackData = await downloadTrackWithRetry(query);
      const filename = `${track.name} - ${track.artist}.mp3`.replace(/[<>:"/\\|?*]+/g, '_');
      zip.addFile(filename, trackData);

      // Add a delay to avoid rate limits
      if (i < tracks.length - 1) {
        await delay(1000);
      }
    }

    // Save the ZIP file to Vercel Blob Storage
    const zipBuffer = zip.toBuffer();
    const blob = await put('playlists/playlist.zip', zipBuffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return res.status(200).json({ url: blob.url });
  } catch (error: any) {
    console.error('Error creating ZIP file:', error.message);
    return res.status(500).json({ error: 'Failed to create ZIP file', details: error.message });
  }
}
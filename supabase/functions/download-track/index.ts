import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as ytdl from 'npm:ytdl-core';
import { FFmpeg } from 'npm:@ffmpeg/ffmpeg';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { trackName, artistName } = await req.json();
    const query = `${trackName} ${artistName} lyrics`;
    
    // Search for the video
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl);
    const html = await response.text();
    
    // Extract video ID from search results
    const videoIdMatch = html.match(/videoId":"([^"]+)"/);
    if (!videoIdMatch) {
      throw new Error('No video found');
    }
    
    const videoId = videoIdMatch[1];
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // Get audio stream
    const info = await ytdl.getInfo(videoUrl);
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    
    // Download and convert to MP3
    const audioStream = await fetch(audioFormat.url);
    const audioBuffer = await audioStream.arrayBuffer();
    
    // Convert to MP3 using FFmpeg
    const ffmpeg = new FFmpeg();
    await ffmpeg.load();
    
    ffmpeg.writeFile('input', new Uint8Array(audioBuffer));
    await ffmpeg.exec(['-i', 'input', '-codec:a', 'libmp3lame', '-q:a', '0', 'output.mp3']);
    const data = await ffmpeg.readFile('output.mp3');
    
    return new Response(data, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${trackName}.mp3"`,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
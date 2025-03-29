import React, { useState, useEffect } from 'react';
import { Music2, Download, Loader2, LogIn, Clock, Music, ListMusic } from 'lucide-react';
import axios from 'axios';

function FloatingParticles() {
  useEffect(() => {
    const container = document.querySelector('.floating-particles');
    if (!container) return;

    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${Math.random() * 3 + 2}s`;
      container.appendChild(particle);

      particle.addEventListener('animationend', () => {
        particle.remove();
      });
    };

    const interval = setInterval(createParticle, 200);
    return () => clearInterval(interval);
  }, []);

  return <div className="floating-particles" />;
}

function GlowEffects() {
  useEffect(() => {
    const container = document.querySelector('.glow-container');
    if (!container) return;

    const createGlow = () => {
      const glow = document.createElement('div');
      glow.className = 'glow-effect';
      glow.style.left = `${Math.random() * 100}%`;
      glow.style.top = `${Math.random() * 100}%`;
      container.appendChild(glow);

      setTimeout(() => glow.remove(), 4000);
    };

    const interval = setInterval(createGlow, 2000);
    return () => clearInterval(interval);
  }, []);

  return <div className="glow-container fixed inset-0 pointer-events-none z-0" />;
}

interface Track {
  id: number;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: string;
  downloading: boolean;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Load environment variables
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  const scope = 'playlist-read-private';

  // Log environment variables for debugging
  console.log('App.tsx - clientId:', clientId);
  console.log('App.tsx - redirectUri:', redirectUri);

  // Validate environment variables
  useEffect(() => {
    if (!clientId || !redirectUri) {
      setStatus({
        type: 'error',
        message: 'Missing Spotify configuration. Please check environment variables.',
      });
    }
  }, [clientId, redirectUri]);

  // Handle Spotify OAuth login
  const handleLogin = () => {
    if (!clientId || !redirectUri) {
      setStatus({
        type: 'error',
        message: 'Cannot login: Missing client ID or redirect URI.',
      });
      return;
    }

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
    window.location.href = authUrl;
  };

  // Extract code from URL and get token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !token) {
      getToken(code);
    }
  }, []); // Run only once on mount to prevent code reuse

  const getToken = async (code: string) => {
    try {
      console.log('Sending token exchange request with:', { code, redirectUri });
      const response = await axios.post('/api/token', { code, redirectUri });
      setToken(response.data.access_token);
      setIsLoggedIn(true);
      setStatus({ type: 'success', message: 'Successfully authenticated with Spotify' });
      window.history.pushState({}, document.title, '/'); // Clean URL
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to authenticate with Spotify';
      const errorDetails = err.response?.data?.details || err.message;
      setStatus({ type: 'error', message: `${errorMessage}: ${errorDetails}` });
      console.error('Token exchange error:', err);
    }
  };

  // Fetch playlist tracks from Spotify
  // const handleFetchPlaylist = async () => {
  //   if (!playlistUrl.trim()) {
  //     setStatus({ type: 'error', message: 'Please enter a valid Spotify playlist URL' });
  //     return;
  //   }
  //   if (!token) {
  //     setStatus({ type: 'error', message: 'Please log in first' });
  //     return;
  //   }

  //   setIsLoading(true);
  //   setStatus({ type: '', message: '' });

  //   const playlistId = playlistUrl.split('/').pop()?.split('?')[0];
  //   let allTracks: Track[] = [];
  //   let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;

  //   try {
  //     while (nextUrl) {
  //       const response = await axios.get(nextUrl, {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });

  //       const fetchedTracks = response.data.items.map((item: any, index: number) => ({
  //         id: allTracks.length + index + 1,
  //         name: item.track.name,
  //         artist: item.track.artists[0].name,
  //         album: item.track.album.name,
  //         albumArt: item.track.album.images[0]?.url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150&h=150&q=80',
  //         duration: `${Math.floor(item.track.duration_ms / 60000)}:${((item.track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}`,
  //         downloading: false,
  //       }));

  //       allTracks = [...allTracks, ...fetchedTracks];
  //       nextUrl = response.data.next;
  //     }

  //     setTracks(allTracks);
  //     setStatus({ type: 'success', message: `Successfully fetched ${allTracks.length} tracks` });
  //   } catch (err: any) {
  //     const errorMessage = err.response?.data?.error?.message || 'Failed to fetch playlist. Check URL or try again.';
  //     setStatus({ type: 'error', message: errorMessage });
  //     console.error('Fetch playlist error:', err);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleFetchPlaylist = async () => {
    if (!playlistUrl.trim()) {
      setStatus({ type: 'error', message: 'Please enter a valid Spotify playlist URL' });
      return;
    }
    if (!token) {
      setStatus({ type: 'error', message: 'Please log in first' });
      return;
    }
  
    setIsLoading(true);
    setStatus({ type: '', message: '' });
  
    const playlistId = playlistUrl.split('/').pop()?.split('?')[0];
    let allTracks: Track[] = [];
    let nextUrl: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  
    try {
      while (nextUrl) {
        const response = await axios.get(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const fetchedTracks = response.data.items.map((item: any, index: number) => ({
          id: allTracks.length + index + 1,
          name: item.track.name,
          artist: item.track.artists[0].name,
          album: item.track.album.name,
          albumArt: item.track.album.images[0]?.url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150&h=150&q=80',
          duration: `${Math.floor(item.track.duration_ms / 60000)}:${((item.track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}`,
          downloading: false,
        }));
  
        allTracks = [...allTracks, ...fetchedTracks];
        nextUrl = response.data.next; // If there's a next page, this will be a URL; otherwise, null
      }
  
      setTracks(allTracks);
      setStatus({ type: 'success', message: `Successfully fetched ${allTracks.length} tracks` });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to fetch playlist. Check URL or try again.';
      setStatus({ type: 'error', message: errorMessage });
      console.error('Fetch playlist error:', err);
    } finally {
      setIsLoading(false);
    }
  };


  // Trigger a file download in the browser
  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download a single track
  const handleDownload = async (trackId: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    setTracks(tracks.map(t => 
      t.id === trackId ? { ...t, downloading: true } : t
    ));

    try {
      const query = `${track.name} ${track.artist}`;
      const response = await axios.post('/api/download', { query });
      const { url } = response.data;

      // Trigger the download
      triggerDownload(url, `${track.name} - ${track.artist}.mp3`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to download track';
      const errorDetails = err.response?.data?.details || err.message;
      setStatus({ type: 'error', message: `${errorMessage}: ${errorDetails}` });
      console.error('Download track error:', err);
    } finally {
      setTracks(tracks.map(t => 
        t.id === trackId ? { ...t, downloading: false } : t
      ));
    }
  };

  // Download all tracks as a ZIP file
  const handleDownloadAll = async () => {
    if (tracks.length === 0) {
      setStatus({ type: 'error', message: 'No tracks to download' });
      return;
    }

    setDownloadingAll(true);
    setStatus({ type: 'info', message: 'Preparing ZIP file... This may take a while.' });

    try {
      const response = await axios.post('/api/download-all', { tracks });
      const { url } = response.data;

      // Trigger the ZIP file download
      triggerDownload(url, 'playlist.zip');
      setStatus({ type: 'success', message: 'ZIP file downloaded successfully' });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create ZIP file';
      const errorDetails = err.response?.data?.details || err.message;
      setStatus({ type: 'error', message: `${errorMessage}: ${errorDetails}` });
      console.error('Download all tracks error:', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white bg-grid relative overflow-hidden">
      <FloatingParticles />
      <GlowEffects />

      {/* Header */}
      <header className="fixed top-0 w-full glass-morphism border-b border-white/10 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <Music2 className="w-8 h-8 neon-text mr-3" />
            <h1 className="text-2xl font-bold neon-text">Spotify Downloader</h1>
          </div>
          {isLoggedIn && (
            <div className="text-sm text-gray-400">
              Connected to Spotify
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-8">
        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] relative">
            <div className="absolute inset-0 bg-[#00ffcc] opacity-5 blur-[100px] rounded-full"></div>
            <button
              onClick={handleLogin}
              className="spotify-gradient px-8 py-4 rounded-full flex items-center gap-2 font-semibold hover:scale-105 transition-transform relative z-10"
            >
              <LogIn className="w-5 h-5" />
              Login with Spotify
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Playlist Input */}
            <div className="max-w-2xl mx-auto">
              <div className="glass-morphism p-6 rounded-xl hover-card">
                <input
                  type="text"
                  placeholder="Enter Spotify Playlist URL"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 focus:neon-border outline-none transition-all"
                />
                <button
                  onClick={handleFetchPlaylist}
                  disabled={isLoading}
                  className="mt-4 w-full bg-[#00ffcc]/20 neon-border rounded-lg px-4 py-3 font-semibold hover:bg-[#00ffcc]/30 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Fetch Playlist'
                  )}
                </button>
              </div>

              {/* Status Message */}
              {status.message && (
                <div className={`mt-4 text-center ${
                  status.type === 'error' ? 'text-red-500' : status.type === 'info' ? 'text-blue-500' : 'text-green-500'
                }`}>
                  {status.message}
                </div>
              )}
            </div>

            {/* Track List */}
            {tracks.length > 0 && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="stats-card">
                    <div>
                      <p className="text-sm text-gray-400">Total Tracks</p>
                      <p className="text-2xl font-bold neon-text">{tracks.length}</p>
                    </div>
                    <ListMusic className="w-8 h-8 text-[#00ffcc]" />
                  </div>
                  <div className="stats-card">
                    <div>
                      <p className="text-sm text-gray-400">Total Duration</p>
                      <p className="text-2xl font-bold neon-text">
                        {Math.floor(tracks.reduce((acc, t) => acc + parseInt(t.duration.split(':')[0]) * 60 + parseInt(t.duration.split(':')[1]), 0) / 3600)}h{' '}
                        {Math.floor((tracks.reduce((acc, t) => acc + parseInt(t.duration.split(':')[0]) * 60 + parseInt(t.duration.split(':')[1]), 0) % 3600) / 60)}m
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-[#00ffcc]" />
                  </div>
                  <div className="stats-card">
                    <div>
                      <p className="text-sm text-gray-400">Playlist Size</p>
                      <p className="text-2xl font-bold neon-text">{(tracks.length * 12.8).toFixed(1)} MB</p>
                    </div>
                    <Music className="w-8 h-8 text-[#00ffcc]" />
                  </div>
                </div>

                {/* Download All Button */}
                <button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="w-full download-all-btn rounded-xl px-6 py-4 flex items-center justify-center gap-2"
                >
                  {downloadingAll ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Downloading All Tracks...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download All Tracks
                    </>
                  )}
                </button>

                {/* Tracks List */}
                <div className="glass-morphism rounded-xl p-6">
                  <div className="track-list-container pr-2">
                    <div className="space-y-4">
                      {tracks.map((track) => (
                        <div
                          key={track.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover-card"
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <img
                              src={track.albumArt}
                              alt={`${track.album} cover`}
                              className="w-16 h-16 track-image"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">{track.name}</h3>
                              <p className="text-sm text-gray-400 truncate">
                                {track.artist} • {track.album}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-400">{track.duration}</span>
                            <button
                              onClick={() => handleDownload(track.id)}
                              disabled={track.downloading}
                              className="neon-border rounded-full p-2 hover:bg-[#00ffcc]/20 transition-all"
                            >
                              {track.downloading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Download className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
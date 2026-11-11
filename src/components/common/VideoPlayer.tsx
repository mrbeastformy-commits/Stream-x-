import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Settings,
  AlertTriangle,
  RefreshCw,
  Send,
  CheckCircle,
  Tv,
  X
} from 'lucide-react';
import { extractYouTubeId, parseYouTubeUrl, checkEmbeddingAllowed } from '../../services/youtube';
import { submitPlaybackReport } from '../../services/mediaService';
import { useWatchlist } from '../../context/WatchlistContext';

interface VideoPlayerProps {
  videoUrl: string;
  videoSource?: 'upload' | 'youtube' | 'direct' | 'hls';
  title: string;
  posterUrl?: string;
  mediaId?: string;
  initialTime?: number;
  autoPlay?: boolean;
  onEnded?: () => void;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  videoSource = 'direct',
  title,
  posterUrl,
  mediaId,
  initialTime = 0,
  autoPlay = true,
  onEnded,
  onClose,
}) => {
  const { saveProgress, getProgress } = useWatchlist();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string>('UNKNOWN');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [reported, setReported] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [hasPromptedResume, setHasPromptedResume] = useState(false);
  const [savedResumeTime, setSavedResumeTime] = useState<number | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isYt = videoSource === 'youtube' || extractYouTubeId(videoUrl) !== null;
  const ytMeta = isYt ? parseYouTubeUrl(videoUrl) : null;

  // Check saved progress
  useEffect(() => {
    if (mediaId && !isYt) {
      const prog = getProgress(mediaId);
      if (prog && prog.timestamp > 15 && prog.timestamp < prog.duration - 15) {
        setSavedResumeTime(prog.timestamp);
      }
    }
  }, [mediaId, isYt, getProgress]);

  // Check YouTube Embedding Permissions & PostMessage errors
  useEffect(() => {
    if (!isYt || !ytMeta || !ytMeta.isValid) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Verify embedding permission
    checkEmbeddingAllowed(ytMeta.videoId).then((res) => {
      if (!res.allowed) {
        setIsLoading(false);
        setErrorType('EMBED_RESTRICTED');
        setErrorMessage(
          res.reason ||
            'Embedding is disabled by the copyright owner. This video cannot be played inside embedded players.'
        );
      } else {
        setIsLoading(false);
      }
    });

    const handleMessage = (event: MessageEvent) => {
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data);
          if (data.event === 'onError' || data.info?.errorCode) {
            const code = data.info?.errorCode || data.data;
            if (code === 101 || code === 150) {
              setErrorType('EMBED_RESTRICTED');
              setErrorMessage(
                'Embedding is disabled by the copyright owner. This content cannot be embedded.'
              );
            } else if (code === 100) {
              setErrorType('NOT_FOUND');
              setErrorMessage('The requested video was not found or is set to private.');
            }
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isYt, ytMeta]);

  // Handle direct HTML5 or HLS video
  useEffect(() => {
    if (isYt || !videoUrl) return;

    setIsLoading(true);
    setErrorMessage(null);

    const video = videoRef.current;
    if (!video) return;

    const isHls = videoUrl.includes('.m3u8') || videoSource === 'hls';

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (savedResumeTime && !hasPromptedResume) {
          // Keep paused for resume dialog
        } else if (autoPlay) {
          video.play().catch(() => setIsPlaying(false));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsLoading(false);
          let errCode = 'STREAM_ERROR';
          let msg = 'Playback failed. The live stream may be temporarily offline.';

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            errCode = 'CORS / NETWORK';
            msg = 'Network connection failed. The broadcast server may be offline or blocking external requests (CORS).';
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            errCode = 'CODEC_ERROR';
            msg = 'Media format error: Stream codec is unsupported by your browser.';
          }
          setErrorType(errCode);
          setErrorMessage(msg);
        }
      });
    } else {
      // Standard video file (MP4, WebM, MOV)
      video.src = videoUrl;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, videoSource, isYt]);

  // Hide controls on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setShowSpeedMenu(false);
      }
    }, 3500);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((e) => {
        console.warn('Play was prevented:', e);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (video) {
      video.volume = vol;
      video.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.warn);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.warn);
    }
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const applyResume = (resume: boolean) => {
    const video = videoRef.current;
    setHasPromptedResume(true);
    if (resume && savedResumeTime && video) {
      video.currentTime = savedResumeTime;
      setCurrentTime(savedResumeTime);
    }
    setSavedResumeTime(null);
    if (autoPlay && video) {
      video.play().then(() => setIsPlaying(true)).catch(console.warn);
    }
  };

  const handleReportIssue = async () => {
    if (reporting || reported) return;
    setReporting(true);
    try {
      await submitPlaybackReport({
        contentId: mediaId || 'stream_' + Date.now(),
        contentTitle: title,
        contentType: videoSource,
        errorType: errorType || 'PLAYBACK_FAIL',
        errorMessage: errorMessage || 'User reported stream buffering or playback failure.',
        status: 'open',
        reportedAt: new Date().toISOString()
      });
      setReported(true);
    } catch (e) {
      console.warn('Failed to submit report', e);
    } finally {
      setReporting(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none group font-sans"
    >
      {/* Top Title Overlay with Close Button (Always visible on hover for BOTH embed & direct video) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-full bg-[#713CFF] text-[10px] font-bold text-white uppercase tracking-wider">
            STREAMX HD
          </span>
          <h2 className="text-sm md:text-base font-semibold text-white drop-shadow truncate max-w-xs md:max-w-md">
            {title}
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shadow-lg"
            title="Close Player"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ================= YouTube Embed Mode ================= */}
      {isYt && ytMeta && ytMeta.isValid ? (
        <div className="w-full h-full relative flex items-center justify-center">
          <iframe
            src={`${ytMeta.embedUrl}&autoplay=1`}
            title={title}
            className="w-full h-full border-0 absolute inset-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        /* ================= HTML5 / HLS Direct Mode ================= */
        <>
          <video
            ref={videoRef}
            poster={posterUrl}
            playsInline
            onTimeUpdate={() => {
              const video = videoRef.current;
              if (video) {
                setCurrentTime(video.currentTime);
                if (mediaId && video.duration > 0) {
                  if (Math.floor(video.currentTime) % 5 === 0) {
                    saveProgress(mediaId, title, video.currentTime, video.duration, posterUrl);
                  }
                }
              }
            }}
            onLoadedMetadata={() => {
              const video = videoRef.current;
              if (video) {
                setDuration(video.duration || 0);
                setIsLoading(false);
              }
            }}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setIsPlaying(true);
            }}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              if (onEnded) onEnded();
            }}
            onError={() => {
              setIsLoading(false);
              const err = videoRef.current?.error;
              let msg = 'Failed to load video stream.';
              let type = 'UNKNOWN';
              if (err) {
                if (err.code === MediaError.MEDIA_ERR_NETWORK) {
                  type = 'NETWORK_CORS';
                  msg = 'Network or CORS error. The stream server refused the connection or is offline.';
                } else if (err.code === MediaError.MEDIA_ERR_DECODE) {
                  type = 'CODEC_ERROR';
                  msg = 'Video decoding error: Unsupported codec or corrupted stream.';
                } else if (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                  type = 'INVALID_SRC';
                  msg = 'Media source not supported or video file removed (404).';
                }
              }
              setErrorType(type);
              setErrorMessage(msg);
            }}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
          />

          {/* Bottom Custom Video Controls (for HTML5/HLS) */}
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 flex flex-col gap-2 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {duration > 0 && isFinite(duration) && (
              <div className="flex items-center gap-3 w-full">
                <span className="text-[11px] font-mono text-slate-300 min-w-[40px]">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#713CFF] hover:h-2 transition-all"
                />
                <span className="text-[11px] font-mono text-slate-400 min-w-[40px] text-right">
                  {formatTime(duration)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>

                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={toggleMute}
                    className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#247BFF]"
                  />
                </div>

                {(!duration || !isFinite(duration)) && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    LIVE BROADCAST
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 relative">
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition"
                  >
                    {playbackSpeed}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-10 right-0 bg-[#171C2B] border border-white/10 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 min-w-[70px] z-50">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => changeSpeed(spd)}
                          className={`px-3 py-1 text-xs rounded-lg text-left transition ${
                            playbackSpeed === spd
                              ? 'bg-[#713CFF] text-white font-bold'
                              : 'text-slate-300 hover:bg-white/5'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading Spinner */}
      {isLoading && !errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none z-20">
          <div className="w-12 h-12 rounded-full border-4 border-t-[#713CFF] border-r-[#247BFF] border-b-transparent border-l-transparent animate-spin mb-3" />
          <span className="text-xs uppercase tracking-widest text-slate-300 font-medium">
            Buffering Stream...
          </span>
        </div>
      )}

      {/* Resume Prompt Dialog */}
      {savedResumeTime && !hasPromptedResume && !isYt && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-30 p-4">
          <div className="bg-[#171C2B] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
            <RotateCcw className="w-10 h-10 text-[#713CFF] mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Resume Watching?</h3>
            <p className="text-xs text-slate-400 mb-5">
              You previously watched up to <span className="text-white font-semibold">{formatTime(savedResumeTime)}</span>. Would you like to resume?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => applyResume(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition"
              >
                Start Over
              </button>
              <button
                onClick={() => applyResume(true)}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-semibold shadow-lg shadow-[#713CFF]/30 hover:opacity-95 transition"
              >
                Resume ({formatTime(savedResumeTime)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Screen with Fix & Diagnostic Details (Handles Embedding Restrictions & Network/CORS) */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#080A12]/95 backdrop-blur-md z-40 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full mb-2">
            Playback Diagnostic: {errorType}
          </span>
          <h3 className="text-lg font-bold text-white mb-2 max-w-md">
            {errorType === 'EMBED_RESTRICTED'
              ? 'Embedding Disabled by Content Owner'
              : 'Stream Temporarily Unavailable'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            {errorMessage}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
              >
                Close Player
              </button>
            )}

            <button
              onClick={() => {
                setErrorMessage(null);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                  videoRef.current.play().catch(console.warn);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Stream
            </button>

            <button
              onClick={handleReportIssue}
              disabled={reporting || reported}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#713CFF] to-[#247BFF] text-white text-xs font-semibold shadow-lg shadow-[#713CFF]/30 disabled:opacity-50 transition"
            >
              {reported ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  Reported to Admin
                </>
              ) : reporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending Report...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Report Stream Issue
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

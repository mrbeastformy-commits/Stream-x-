import Hls from 'hls.js';
import { extractYouTubeId } from './youtube';

export interface TestResult {
  success: boolean;
  status: 'working' | 'error';
  errorType?: 'CORS' | 'OFFLINE' | 'CODEC' | 'INVALID_URL' | 'NETWORK' | 'FORMAT_UNSUPPORTED' | 'YOUTUBE_RESTRICTED';
  message: string;
  testedAt: string;
  duration?: number;
}

/**
 * Perform a real playback test on a video stream or URL
 */
export async function testVideoStream(url: string, timeoutMs: number = 10000): Promise<TestResult> {
  const testedAt = new Date().toISOString();

  if (!url || !url.trim()) {
    return {
      success: false,
      status: 'error',
      errorType: 'INVALID_URL',
      message: 'Video URL is empty or blank',
      testedAt
    };
  }

  const cleanUrl = url.trim();

  // Test YouTube Video URL
  const ytId = extractYouTubeId(cleanUrl);
  if (ytId) {
    try {
      // Test thumbnail reachability to verify video exists and network is up
      const img = new Image();
      const imgPromise = new Promise<boolean>((resolve) => {
        img.onload = () => {
          // If default placeholder thumbnail of 120x90 is returned for missing videos
          if (img.naturalWidth === 120 && img.naturalHeight === 90) {
            resolve(false);
          } else {
            resolve(true);
          }
        };
        img.onerror = () => resolve(false);
        img.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      });

      const timer = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('YouTube connection timeout')), 6000)
      );

      const isValid = await Promise.race([imgPromise, timer]).catch(() => false);

      if (!isValid) {
        return {
          success: false,
          status: 'error',
          errorType: 'OFFLINE',
          message: 'YouTube video appears unavailable, deleted or restricted from embedding.',
          testedAt
        };
      }

      return {
        success: true,
        status: 'working',
        message: 'YouTube video stream is reachable and valid for embedding.',
        testedAt
      };
    } catch {
      return {
        success: false,
        status: 'error',
        errorType: 'NETWORK',
        message: 'Could not connect to YouTube service.',
        testedAt
      };
    }
  }

  // Check valid protocol
  try {
    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:', 'blob:'].includes(parsed.protocol)) {
      return {
        success: false,
        status: 'error',
        errorType: 'INVALID_URL',
        message: `Unsupported URL protocol: ${parsed.protocol}`,
        testedAt
      };
    }
  } catch {
    return {
      success: false,
      status: 'error',
      errorType: 'INVALID_URL',
      message: 'Malformed video URL format',
      testedAt
    };
  }

  // Test HLS Stream (.m3u8)
  const isHls = cleanUrl.includes('.m3u8') || cleanUrl.includes('/hls/');
  if (isHls && Hls.isSupported()) {
    return new Promise((resolve) => {
      const hls = new Hls({
        enableWorker: false,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 8000,
        levelLoadingTimeOut: 8000,
      });

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;

      let resolved = false;

      const cleanup = () => {
        hls.destroy();
        video.src = '';
        video.remove();
      };

      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            status: 'error',
            errorType: 'OFFLINE',
            message: 'Stream timed out during manifest load. The live stream may be offline or unreachable.',
            testedAt
          });
        }
      }, timeoutMs);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          cleanup();
          resolve({
            success: true,
            status: 'working',
            message: `HLS stream verified. Manifest parsed with ${data.levels?.length || 1} quality level(s).`,
            testedAt
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_, errorData) => {
        if (errorData.fatal && !resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          let errType: TestResult['errorType'] = 'NETWORK';
          let msg: string = String(errorData.details || 'HLS playback error occurred.');

          if (errorData.type === Hls.ErrorTypes.NETWORK_ERROR) {
            errType = 'CORS';
            msg = `Network/CORS error: Stream server rejected connection or is offline. (${errorData.details})`;
          } else if (errorData.type === Hls.ErrorTypes.MEDIA_ERROR) {
            errType = 'CODEC';
            msg = `Media codec error: Stream uses an unsupported audio/video codec. (${errorData.details})`;
          }

          cleanup();
          resolve({
            success: false,
            status: 'error',
            errorType: errType,
            message: msg,
            testedAt
          });
        }
      });

      try {
        hls.loadSource(cleanUrl);
        hls.attachMedia(video);
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          cleanup();
          resolve({
            success: false,
            status: 'error',
            errorType: 'NETWORK',
            message: e instanceof Error ? e.message : 'Failed to attach stream.',
            testedAt
          });
        }
      }
    });
  }

  // Direct HTML5 Video (MP4, WebM, MOV, Ogg)
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let resolved = false;

    const cleanup = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
    };

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          status: 'error',
          errorType: 'OFFLINE',
          message: 'Video test timed out after ' + Math.round(timeoutMs / 1000) + 's. Server took too long to respond.',
          testedAt
        });
      }
    }, timeoutMs);

    video.onloadedmetadata = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        const duration = video.duration || 0;
        cleanup();
        resolve({
          success: true,
          status: 'working',
          message: `Video stream verified. Duration: ${Math.round(duration)}s, dimensions: ${video.videoWidth}x${video.videoHeight}.`,
          duration,
          testedAt
        });
      }
    };

    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        const err = video.error;
        let errType: TestResult['errorType'] = 'NETWORK';
        let detail = 'Unknown error';

        if (err) {
          switch (err.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              detail = 'Playback aborted by user/network.';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              detail = 'Network error: could not fetch media resource or CORS blocked.';
              errType = 'CORS';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              detail = 'Codec/Decode error: file is corrupted or uses an unsupported codec.';
              errType = 'CODEC';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              detail = 'Format or MIME type not supported by browser, or URL returned 404/403.';
              errType = 'FORMAT_UNSUPPORTED';
              break;
          }
        }

        cleanup();
        resolve({
          success: false,
          status: 'error',
          errorType: errType,
          message: detail,
          testedAt
        });
      }
    };

    video.src = cleanUrl;
  });
}

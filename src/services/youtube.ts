/**
 * Video URL Parser, Validator, and Embed generator for STREAMX
 * Seamlessly handles direct video streams (MP4/WebM/MOV/HLS) and supported video links.
 */

export interface YouTubeMeta {
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
  hqThumbnailUrl: string;
  isValid: boolean;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Pattern covering:
  // - https://www.youtube.com/watch?v=XXXX
  // - https://youtu.be/XXXX
  // - https://www.youtube.com/embed/XXXX
  // - https://www.youtube.com/shorts/XXXX
  // - https://www.youtube.com/live/XXXX
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = cleanUrl.match(regExp);

  if (match && match[1]) {
    return match[1];
  }

  // If user pasted pure 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

export function parseYouTubeUrl(url: string): YouTubeMeta {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return {
      videoId: '',
      embedUrl: '',
      thumbnailUrl: '',
      hqThumbnailUrl: '',
      isValid: false
    };
  }

  // Standard official embed with parameters preventing external suggestions and external redirects
  return {
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    hqThumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    isValid: true
  };
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Validates if video embedding is allowed or if the video has embedding disabled by copyright
 */
export async function checkEmbeddingAllowed(videoId: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl, { method: 'GET' });

    if (res.status === 401 || res.status === 403) {
      return {
        allowed: false,
        reason: 'Embedding is restricted or disabled by the video owner/copyright policy.'
      };
    }

    if (res.status === 404) {
      return {
        allowed: false,
        reason: 'Video was not found or is set to private.'
      };
    }

    if (!res.ok) {
      return {
        allowed: false,
        reason: `Video service returned status ${res.status}.`
      };
    }

    return { allowed: true };
  } catch {
    // If CORS or offline, fallback to standard embedding
    return { allowed: true };
  }
}

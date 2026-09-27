/**
 * Shared YouTube helpers.
 *
 * Every YouTube link that reaches this app can arrive in a dozen shapes:
 * a bare 11-character id, a `watch?v=` link, a `youtu.be` short link, an
 * `/embed/`, `/shorts/`, `/live/` or `/v/` path, a mobile/legacy host, or a
 * radio/mix URL that carries `list=RD...&start_radio=1`.
 *
 * Naive regex extraction breaks on several of those and leaks the raw string
 * into `/embed/<raw>`, which YouTube answers with "Configuration error".
 * These helpers always return either a valid 11-character id or `null`.
 */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Hosts we accept (the official ones plus common regional/legacy aliases). */
const WATCH_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'gaming.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

const PATH_PREFIXES = ['embed', 'shorts', 'live', 'v', 'e'];

const isValidId = (value) => typeof value === 'string' && VIDEO_ID.test(value);

/**
 * Extract a bare, embeddable 11-character video id.
 * @param {unknown} input
 * @returns {string|null}
 */
export const extractYouTubeId = (input) => {
  const value = String(input ?? '').trim();
  if (!value) return null;

  // 1. Already a bare id
  if (isValidId(value)) return value;

  // 2. Absolute (or protocol-relative) URL
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('//')
    ? value
    : `https://${value}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    url = null;
  }

  if (url) {
    const host = url.hostname.toLowerCase().replace(/^www\./, '');

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (isValidId(id)) return id;
    }

    if (WATCH_HOSTS.has(host) || host.endsWith('.youtube.com') || host.endsWith('youtube.com')) {
      // `v` query param is authoritative, but only when it looks like an id.
      // Guards against `?v=RDAMVTHEcx` style playlist/radio params.
      const v = url.searchParams.get('v');
      if (isValidId(v)) return v;

      // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length && PATH_PREFIXES.includes(segments[0].toLowerCase())) {
        const id = segments[1];
        if (isValidId(id)) return id;
      }
    }
  }

  // 3. Last resort: a loose scan for a well-formed id anywhere in the string.
  const loose = value.match(/(?:v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/|\/v\/)([A-Za-z0-9_-]{11})/);
  return loose && isValidId(loose[1]) ? loose[1] : null;
};

/**
 * Normalise any YouTube link to a canonical `watch?v=<id>` URL.
 * Falls back to `fallbackId` when the input cannot be understood.
 * @param {unknown} input
 * @param {string} [fallbackId]
 */
export const getYouTubeWatchUrl = (input, fallbackId = 'dQw4w9WgXcQ') => {
  const id = extractYouTubeId(input) || (isValidId(fallbackId) ? fallbackId : 'dQw4w9WgXcQ');
  return `https://www.youtube.com/watch?v=${id}`;
};

/** Thumbnail URL for a video id, used by click-to-play posters. */
export const getYouTubeThumbnail = (input) => {
  const id = extractYouTubeId(input);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;
};

/** Human-readable reason for a YouTube IFrame API error code. */
export const describeYouTubeError = (code) => {
  switch (Number(code)) {
    case 2:
      return 'This video id is not valid.';
    case 5:
      return 'The video owner has disabled playback in embedded players.';
    case 100:
      return 'This video is private or has been removed.';
    case 101:
    case 150:
      return 'The video owner does not allow embedding on this site.';
    case 153:
      return 'YouTube could not identify the referring page for this request.';
    default:
      return 'The video could not be played.';
  }
};

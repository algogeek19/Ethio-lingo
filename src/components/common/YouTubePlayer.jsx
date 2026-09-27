import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

const API_SRC = 'https://www.youtube.com/iframe_api';
const API_TIMEOUT_MS = 12000;

let apiPromise = null;
let apiTimedOut = false;

/**
 * Load the YouTube IFrame Player API exactly once per document.
 * Resolves with `window.YT`, rejects when the script is blocked
 * (ad blocker / privacy extension / filtered network).
 */
const loadYouTubeApi = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));

  if (window.YT && typeof window.YT.Player === 'function') return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    let settled = false;

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') {
        try {
          previous();
        } catch {
          /* ignore third-party handler failures */
        }
      }
      finish(resolve, window.YT);
    };

    const script = document.createElement('script');
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      finish(reject, new Error('YouTube IFrame API blocked'));
    };
    document.head.appendChild(script);

    setTimeout(() => {
      if (settled) return;
      apiTimedOut = true;
      apiPromise = null;
      finish(reject, new Error('YouTube IFrame API timed out'));
    }, API_TIMEOUT_MS);
  });

  return apiPromise;
};

const YouTubePlayer = forwardRef(function YouTubePlayer(
  {
    videoId,
    playing = false,
    muted = false,
    loop = false,
    progressInterval = 500,
    onReady,
    onProgress,
    onEnded,
    onError,
    onBlocked,
    onStateChange,
  },
  ref
) {
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Callbacks and creation-time options live in refs so the player is only
  // built when `videoId` changes. Inline handlers in the parent must not
  // force a rebuild, and muted/loop are only applied while constructing.
  const handlers = useRef({});
  handlers.current = { onProgress, onEnded, onError, onStateChange, onReady, onBlocked };

  const optionsRef = useRef({ muted, loop });
  optionsRef.current = { muted, loop };

  // ---- Create / destroy the player when the video changes ----------------
  useEffect(() => {
    if (!videoId) return undefined;

    let cancelled = false;
    let player = null;
    const host = hostRef.current;
    setIsReady(false);
    setBlocked(false);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host) return;

        player = new YT.Player(host, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            fs: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              if (optionsRef.current.muted && player.mute) player.mute();
              setIsReady(true);
              handlers.current.onReady?.(player);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              handlers.current.onStateChange?.(event?.data);

              switch (event?.data) {
                case 0: // ENDED
                  handlers.current.onEnded?.();
                  break;
                case 1: // PLAYING
                  playerRef.current = player;
                  setBlocked(false);
                  break;
                default:
                  break;
              }
            },
            onError: (event) => {
              if (cancelled) return;
              handlers.current.onError?.(event?.data);
            },
          },
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[YouTubePlayer] IFrame API unavailable:', err?.message || err);
        setBlocked(true);
        handlers.current.onBlocked?.(true);
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      try {
        if (player && typeof player.destroy === 'function') player.destroy();
        // YT leaves the iframe behind; clear it so the next mount
        // starts from a clean container.
        if (host) host.innerHTML = '';
      } catch {
        /* ignore teardown failures */
      }
    };
  }, [videoId]);

  // ---- Reflect the `playing` prop on the real player ---------------------
  useEffect(() => {
    const player = playerRef.current;
    if (!isReady || !player) return;
    try {
      if (playing) {
        if (optionsRef.current.loop && player.setLoop) player.setLoop(true);
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch (err) {
      console.warn('[YouTubePlayer] play/pause failed:', err);
    }
  }, [playing, isReady]);

  // ---- Report playback position / duration -------------------------------
  useEffect(() => {
    if (!isReady) return undefined;
    const player = playerRef.current;
    if (!player) return undefined;

    const tick = () => {
      try {
        const duration = player.getDuration?.() || 0;
        const playedSeconds = player.getCurrentTime?.() || 0;

        // getDuration() is 0 until metadata is buffered, which is why the
        // task timer used to read a permanent 00:00 / 00:00. Report every
        // tick once metadata exists, and keep a pre-roll tick so the parent
        // sees the stream come to life even before playback starts.
        handlers.current.onProgress?.({
          duration,
          playedSeconds,
          played: duration > 0 ? Math.min(Math.max(playedSeconds / duration, 0), 1) : 0,
        });
      } catch (err) {
        // getCurrentTime() throws when the player is in an unusable state
        // (error 153 / torn-down embed). Surface it without spamming.
        console.warn('[YouTubePlayer] position read failed:', err);
        handlers.current.onError?.(-1);
      }
    };

    tick();
    const id = setInterval(tick, progressInterval);
    return () => clearInterval(id);
  }, [isReady, progressInterval, videoId]);

  useImperativeHandle(ref, () => ({
    get currentTime() {
      try {
        return playerRef.current?.getCurrentTime?.() || 0;
      } catch {
        return 0;
      }
    },
    get duration() {
      try {
        return playerRef.current?.getDuration?.() || 0;
      } catch {
        return 0;
      }
    },
    seekTo(seconds, allowSeekAhead = true) {
      try {
        playerRef.current?.seekTo?.(seconds, allowSeekAhead);
      } catch (err) {
        console.warn('[YouTubePlayer] seek failed:', err);
      }
    },
    play: () => {
      try {
        playerRef.current?.playVideo?.();
      } catch {
        /* ignore */
      }
    },
    pause: () => {
      try {
        playerRef.current?.pauseVideo?.();
      } catch {
        /* ignore */
      }
    },
  }));

  if (!videoId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs font-mono">
        No video configured for this module.
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* The YT API replaces this node with its own <iframe>. */}
      <div ref={hostRef} className="w-full h-full" />
      {blocked && (
        <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-xs font-mono px-6 text-center">
          {apiTimedOut
            ? 'YouTube player timed out — check your connection or ad blocker.'
            : 'Embedded player blocked by your browser or network.'}
        </div>
      )}
    </div>
  );
});

export default YouTubePlayer;

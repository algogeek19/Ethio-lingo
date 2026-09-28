import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

// The IFrame API script and the embed host must agree. The API already
// defaults the `host` option to this exact origin whenever the target element
// is not itself an <iframe>, so the option is deliberately not passed here.
// Overriding it (e.g. to www.youtube-nocookie.com, which does not serve
// /iframe_api at all) points the embed at an origin the API was never
// loaded from.
//
// Note: "Failed to execute 'postMessage' ... The target origin provided
// ('https://www.youtube.com') does not match the recipient window's origin"
// is emitted by YouTube's own embed-side code, not by us. Outbound messages
// from this file target the origin of the embed's src, so that direction is
// correct and the message is not actionable.
const YT_HOST = 'https://www.youtube.com';
const API_SRC = `${YT_HOST}/iframe_api`;
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
    // Start as soon as the player is ready. Needed when playback is kicked
    // off by a click: the user-gesture token does not survive the async
    // iframe mount, so relying on a later playVideo() call gets muted by
    // Chrome's autoplay policy.
    autoStart = false,
    // Let YouTube draw its own control bar. Used by the landing explainer,
    // which has no custom chrome, so a visitor still gets pause and seek.
    nativeControls = false,
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
  // Whether the current player has already applied its initial play state.
  const settledRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  // Callbacks and creation-time options live in refs so the player is only
  // built when `videoId` changes. Inline handlers in the parent must not
  // force a rebuild, and muted/loop are only applied while constructing.
  const handlers = useRef({});
  handlers.current = { onProgress, onEnded, onError, onStateChange, onReady, onBlocked };

  const optionsRef = useRef({ muted, loop, autoStart, nativeControls });
  optionsRef.current = { muted, loop, autoStart, nativeControls };

  // ---- Create / destroy the player when the video changes ----------------
  useEffect(() => {
    if (!videoId) return undefined;

    let cancelled = false;
    let player = null;
    const host = hostRef.current;
    setIsReady(false);
    setBlocked(false);
    // A fresh player has not settled its initial play state yet; see the
    // `playing` effect below.
    settledRef.current = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host) return;

        player = new YT.Player(host, {
          videoId,
          playerVars: {
            autoplay: optionsRef.current.autoStart ? 1 : 0,
            // Browsers hard-block *unmuted* autoplay, and the user gesture that
            // mounted this iframe does not survive the async player boot. An
            // autostarting embed therefore has to begin muted or it silently
            // refuses to start. With nativeControls the visitor can unmute
            // using YouTube's own bar.
            mute: optionsRef.current.muted || optionsRef.current.autoStart ? 1 : 0,
            controls: optionsRef.current.nativeControls ? 1 : 0,
            // The task player enforces its own seek lock in React, so the
            // native keyboard shortcuts must stay off. The landing explainer
            // hands control back to YouTube entirely.
            disablekb: optionsRef.current.nativeControls ? 0 : 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            fs: optionsRef.current.nativeControls ? 1 : 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              if (optionsRef.current.muted && player.mute) player.mute();
              setIsReady(true);
              handlers.current.onReady?.(player);
              if (optionsRef.current.autoStart) {
                try {
                  player.playVideo();
                } catch (err) {
                  console.warn('[YouTubePlayer] autostart failed:', err);
                }
              }
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
  //
  // This must NOT act on the render where the player first becomes ready: that
  // render's play state is decided by `autoStart` inside onReady. Without this
  // guard the two disagree — a consumer that sets autoStart and leaves `playing`
  // at its default `false` (the landing explainer) got told to play by onReady
  // and then immediately paused again, so the video never started.
  useEffect(() => {
    const player = playerRef.current;
    if (!isReady || !player) return;
    if (!settledRef.current) {
      settledRef.current = true;
      return;
    }
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

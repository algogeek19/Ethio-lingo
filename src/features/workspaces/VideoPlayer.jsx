import React, { useState, useEffect, useRef } from 'react';
import YouTubePlayer from '../../components/common/YouTubePlayer';
import {
  Download,
  CheckCircle,
  Clock,
  Video,
  Film,
  AlertCircle,
  BookOpen,
  FileText,
  Lock,
  Play,
  Pause,
  AlertTriangle,
  ExternalLink,
  Maximize,
  Minimize,
} from 'lucide-react';
import { useStaking } from '../../context/StakingContext';
import { api } from '../../services/api';
import {
  extractYouTubeId,
  getYouTubeWatchUrl,
  describeYouTubeError,
} from '../../utils/youtube';

/**
 * Video sources come straight from the admin curriculum editor, so they can be
 * any YouTube link shape — including radio/mix URLs (`list=RD...`) that
 * YouTube refuses to embed ("Configuration error"). `extractYouTubeId` from
 * `utils/youtube` keeps only the 11-character id and drops every other
 * parameter, which is the only form that is safe to hand to the player.
 */

const formatTime = (seconds) => {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const VideoPlayer = ({ mode = 'task1', onNavigate }) => {
  const { dailyTasks, completeTask, currentModuleDay, user, isFreeTrialMode, workspaceModule } = useStaking();
  const playerRef = useRef(null);
  const frameRef = useRef(null);

  // Playback & Tab Visibility State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);

  // Auto-hiding chrome. The overlay controls and progress tracker fade out
  // while the video plays and the pointer is idle, then return on any
  // pointer movement — the same behaviour YouTube uses.
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Live mirror of the state the chrome timers depend on. The pointer
  // handlers are re-created every render, but the idle timer must survive
  // re-renders, so it lives in a ref rather than component state.
  const chromeStateRef = useRef({ isPlaying: false, playerBlocked: false });
  const chromeTimerRef = useRef(null);

  // Strict Seeking Lock State (No seeking allowed at all)
  const [lastPlayedSeconds, setLastPlayedSeconds] = useState(0);
  const [seekWarning, setSeekWarning] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Playback metrics for the editorial progress bar
  const [playedFraction, setPlayedFraction] = useState(0);
  const [duration, setDuration] = useState(0);

  // Set when the embed cannot initialise at all (blocked by an adblocker,
  // a privacy extension, or a network that filters /embed/ requests). Without
  // this the player just sits at 00:00 / 00:00 with no explanation.
  const [playerBlocked, setPlayerBlocked] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  // Why playback failed (embedding disabled, private, blocked, ...).
  const [playerError, setPlayerError] = useState('');

  // Mirror the state the chrome timers depend on. This MUST come after the
  // `playerBlocked` declaration above: reading it any earlier puts the
  // reference in that binding's temporal dead zone and throws on every render.
  chromeStateRef.current = { isPlaying, playerBlocked };

  // Task 2 Category State ('informative' | 'entertainment')
  const [listeningCategory, setListeningCategory] = useState('informative');

  const moduleData = workspaceModule;

  // Dynamic Videos Data from API moduleData
  const videoData = {
    task1: {
      title: moduleData?.title || `${user?.level || 'Beginner I'} • Day ${currentModuleDay} Daily English Lesson`,
      videoId: extractYouTubeId(moduleData?.lessonVideoUrl) || 'dQw4w9WgXcQ',
      referenceFile: moduleData?.refGuideTitle || `Birrend_${user?.level?.replace(/\s+/g, '_')}_Day${currentModuleDay}_Reference_Guide.pdf`,
    },
    informative: {
      title: `${user?.level || 'Beginner I'} • Listening Practice (Informative: Academic & Global English)`,
      videoId: extractYouTubeId(moduleData?.listeningInformativeUrl) || 'eIho2S0ZahI',
    },
    entertainment: {
      title: `${user?.level || 'Beginner I'} • Listening Practice (Entertainment: Cultural & Storytelling English)`,
      videoId: extractYouTubeId(moduleData?.listeningEntertainmentUrl) || 'H14bBuluwB8',
    },
  };

  const currentVideo =
    mode === 'task1'
      ? videoData.task1
      : listeningCategory === 'informative'
        ? videoData.informative
        : videoData.entertainment;

  const videoId = currentVideo.videoId;
  const watchUrl = getYouTubeWatchUrl(videoId);

  const [videoTitle, setVideoTitle] = useState(currentVideo.title);

  // Reset playback metrics when the source changes
  useEffect(() => {
    setDuration(0);
    setPlayedFraction(0);
    setLastPlayedSeconds(0);
    setIsPlaying(false);
    setPlayerBlocked(false);
    setPlayerReady(false);
    setPlayerError('');
  }, [videoId]);

  // If playback was requested but the embed never reports a duration, the
  // iframe is being blocked (adblocker / privacy extension / network filter).
  // Surface a usable fallback instead of a silent 00:00 / 00:00 player.
  useEffect(() => {
    if (!isPlaying || duration > 0 || playerReady) return undefined;
    const timer = setTimeout(() => setPlayerBlocked(true), 8000);
    return () => clearTimeout(timer);
  }, [isPlaying, duration, playerReady]);

  useEffect(() => {
    let isMounted = true;
    setVideoTitle(currentVideo.title);

    const loadVideoTitle = async () => {
      try {
        const response = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(watchUrl)}`
        );
        if (!response.ok) return;

        const data = await response.json();
        if (isMounted && data?.title) {
          setVideoTitle(`${currentVideo.title} — ${data.title}`);
        }
      } catch {
        // Fallback title
      }
    };

    loadVideoTitle();
    return () => {
      isMounted = false;
    };
  }, [currentVideo.title, watchUrl]);

  // 1C. AUTO-HIDING CHROME: reveal on pointer activity, retract when idle.
  // Controls stay pinned whenever the video is paused or the player is in
  // trouble, so the user is never left without a way to resume.
  const CHROME_IDLE_MS = 2800;

  const canRetractChrome = () =>
    chromeStateRef.current.isPlaying && !chromeStateRef.current.playerBlocked;

  const revealChrome = () => {
    setShowControls(true);
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    if (canRetractChrome()) {
      chromeTimerRef.current = setTimeout(() => setShowControls(false), CHROME_IDLE_MS);
    }
  };

  // Pointer left the frame: start counting down even without further movement.
  const scheduleChromeRetract = () => {
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    if (canRetractChrome()) {
      chromeTimerRef.current = setTimeout(() => setShowControls(false), CHROME_IDLE_MS);
    }
  };

  useEffect(() => {
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    if (isPlaying && !playerBlocked) {
      chromeTimerRef.current = setTimeout(() => setShowControls(false), CHROME_IDLE_MS);
    } else {
      setShowControls(true);
    }
    return () => {
      if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    };
  }, [isPlaying, playerBlocked]);

  // 1D. FULLSCREEN: request on the frame so the YouTube iframe scales with it,
  // and keep React state in sync with the browser's own escape/tab handling.
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      if (document.fullscreenElement === frame) {
        await document.exitFullscreen();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        await frame.requestFullscreen();
      } else {
        await frame.requestFullscreen();
      }
    } catch (err) {
      // iOS Safari only supports fullscreen on the video element itself.
      console.warn('Fullscreen request failed:', err);
    }
  };

  // 1. PAGE VISIBILITY API: Auto-pause playback when tab is inactive/hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
        setIsPlaying(false);
      } else {
        setIsTabActive(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 1B. KEYBOARD SEEKING PROTECTION: Prevent arrow keys, J/L keys, number keys from seeking/fast-forwarding video
  useEffect(() => {
    const handleKeyDown = (e) => {
      const forbiddenSeekKeys = [
        'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown',
        'KeyL', 'KeyJ',
        'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4',
        'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
        'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4',
        'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
        'PageUp', 'PageDown', 'Home', 'End'
      ];

      if (forbiddenSeekKeys.includes(e.code) || forbiddenSeekKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setSeekWarning(true);
        setTimeout(() => setSeekWarning(false), 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // 1E. PLAYER SHORTCUTS: K toggles playback, F toggles fullscreen. Neither is
  // a seek key, so both stay available under the lock in 1B.
  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (e.code === 'KeyK') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
        revealChrome();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
        revealChrome();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => {
      window.removeEventListener('keydown', handleShortcut);
    };
    // revealChrome and toggleFullscreen close over refs, so reading them once
    // on mount is safe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. STRICT SEEKING LOCK ENFORCEMENT & TIMER PROGRESS
  const lastPlayedRef = useRef(0);

  const handleProgress = ({ playedSeconds, played, duration: total }) => {
    setPlayedFraction(played);

    // Metadata arriving means the embed is alive and the clock is running.
    if (total > 0) {
      setDuration(total);
      setPlayerBlocked(false);
    }

    const previous = lastPlayedRef.current;

    // A jump larger than the poll interval allows means the viewer seeked
    // (or used keyboard shortcuts inside the iframe). Snap them back.
    if (playedSeconds > previous + 2) {
      setSeekWarning(true);
      playerRef.current?.seekTo(previous, true);
      setTimeout(() => setSeekWarning(false), 3000);
      return;
    }

    if (playedSeconds > previous) {
      lastPlayedRef.current = playedSeconds;
      setLastPlayedSeconds(playedSeconds);
    }
  };

  // 3. PLAYER LIFECYCLE — reset the seek-lock anchor and report errors
  const handlePlayerReady = () => {
    setPlayerReady(true);
    setPlayerBlocked(false);
  };

  const handlePlayerBlocked = (blocked) => {
    setPlayerBlocked(!!blocked);
  };

  const handlePlayerError = (code) => {
    // -1 is our internal "position query failed" signal, not a player fault.
    if (Number(code) === -1) return;
    console.warn('YouTube player error:', code, describeYouTubeError(code));
    setPlayerError(describeYouTubeError(code));
    setPlayerBlocked(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (mode === 'task1') {
      completeTask('lesson');
    } else {
      completeTask('video');
    }
  };

  const handleDownloadReference = async () => {
    const pdfUrl = moduleData?.refGuideUrl;
    const refTitle = moduleData?.refGuideTitle || currentVideo.referenceFile || `Birrend_Day_${currentModuleDay}_Reference_Guide`;
    const cleanFileName = `${refTitle.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;

    if (pdfUrl && pdfUrl.startsWith('http')) {
      try {
        const response = await fetch(pdfUrl);
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = cleanFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 3500);
          return;
        }
      } catch {
        // Fallback to direct opening/download in a new tab if CORS prevents fetch blob
        window.open(pdfUrl, '_blank');
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 3500);
        return;
      }
    }

    // Fallback if no custom PDF file URL is present in database
    const content = `=======================================================
ETHIO-LINGO CURRICULUM MANUAL & REFERENCE GUIDE
Level: ${user?.level || 'Beginner I'} • Day ${currentModuleDay}
Title: ${currentVideo.title || 'Daily Module'}
Reference Guide: ${refTitle}
=======================================================

DESCRIPTION & TECHNICAL TERMS:
${moduleData?.refGuideDescription || 'Standard English Grammar & Technical Terms Guide.'}

INSTRUCTIONS:
- Review the technical terms above before attempting the Daily Exam.
- High scores protect your daily stake and advance your streak.

=======================================================
© 2026 Ethio-Lingo Platforms PLC. All rights reserved.
=======================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFileName.replace(/\.pdf$/, '.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  const taskDone = mode === 'task1' ? !!dailyTasks.lesson : !!dailyTasks.video;
  const verificationPct = Math.round(Math.min(Math.max(playedFraction, 0), 1) * 100);
  const refGuideTitle = moduleData?.refGuideTitle || currentVideo.referenceFile;

  // Keep the seek-lock anchor in sync with the state above.
  useEffect(() => {
    lastPlayedRef.current = lastPlayedSeconds;
  }, [lastPlayedSeconds]);

  return (
    <div className="space-y-6 transition-colors duration-250">
      {/* Tab Visibility Active Warning Banner */}
      {!isTabActive && (
        <div className="p-3.5 bg-warning-amber/10 border border-warning-amber/30 rounded-xl text-xs text-warning-amber flex items-center justify-between shadow-xs animate-pulse font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              <strong>Playback Auto-Paused:</strong> Tab became inactive. Active focus required to validate task time.
            </span>
          </div>
        </div>
      )}

      {/* Seeking Lock Enforcement Alert */}
      {seekWarning && (
        <div className="p-3.5 bg-error/10 border border-error/30 rounded-xl text-xs text-error flex items-center justify-between shadow-xs font-mono">
          <div className="flex items-center gap-2">
            <Lock size={16} className="shrink-0" />
            <span>
              <strong>Seeking Restricted:</strong> Fast-forwarding is disabled on mandatory task videos. Returning to played timestamp.
            </span>
          </div>
        </div>
      )}

      {/* Header Bar with Task Type */}
      <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 bg-primary/10 text-primary font-mono text-[9px] font-semibold rounded uppercase tracking-wider">
              {mode === 'task1' ? 'Task 1 · Lesson Lecture' : 'Task 2 · Listening Skill'}
            </span>
            <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
              Day {currentModuleDay} • {user?.level || 'Beginner I'}
            </span>
          </div>
          <h2 className="font-cormorant text-2xl font-normal text-on-surface mt-2 leading-snug">{videoTitle}</h2>
        </div>

        {/* Task Completion Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {taskDone ? (
            <span className="px-4 py-2 bg-success-green/10 border border-success-green/25 text-success-green text-[10px] font-bold font-mono rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
              <CheckCircle size={14} />
              <span>Task Completed</span>
            </span>
          ) : (
            <span className="px-4 py-2 bg-surface-container text-on-surface-variant text-[10px] font-semibold font-mono rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              <span>Watch Full Video to Unlock</span>
            </span>
          )}
        </div>
      </div>

      {/* Task 2 Category Selector (Informative vs Entertainment Choice) */}
      {mode === 'task2' && (
        <div className="bg-surface-container/60 p-1 rounded-full border border-hairline/40 shadow-sm flex items-center gap-1 max-w-md mx-auto">
          <button
            onClick={() => {
              setListeningCategory('informative');
              setLastPlayedSeconds(0);
              setIsPlaying(false);
            }}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-full transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer ${
              listeningCategory === 'informative'
                ? 'bg-surface-lowest text-on-surface shadow-sm border border-hairline/40'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Film size={14} />
            <span>Informative (Academic)</span>
          </button>

          <button
            onClick={() => {
              setListeningCategory('entertainment');
              setLastPlayedSeconds(0);
              setIsPlaying(false);
            }}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-full transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer ${
              listeningCategory === 'entertainment'
                ? 'bg-surface-lowest text-on-surface shadow-sm border border-hairline/40'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Video size={14} />
            <span>Entertainment (Culture)</span>
          </button>
        </div>
      )}

      {/* Video frame — seek-locked lecture / listening stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`${mode === 'task1' ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-4`}>
          <div
            ref={frameRef}
            onPointerMove={revealChrome}
            onPointerDown={revealChrome}
            onPointerLeave={scheduleChromeRetract}
            className={`relative group bg-[#1a1413] overflow-hidden shadow-xl ${
              isFullscreen ? '' : 'rounded-2xl'
            }`}
          >
            {/* In fullscreen the fixed 16:9 ratio must be released, otherwise
                the video letterboxes into a small strip in the middle. */}
            <div className={`relative w-full ${isFullscreen ? 'h-screen' : 'aspect-video'}`}>
              <div className="absolute inset-0">
                <YouTubePlayer
                  key={videoId}
                  ref={playerRef}
                  videoId={videoId}
                  playing={isPlaying && isTabActive}
                  progressInterval={500}
                  onReady={handlePlayerReady}
                  onProgress={handleProgress}
                  onEnded={handleEnded}
                  onError={handlePlayerError}
                  onBlocked={handlePlayerBlocked}
                  onStateChange={(state) => {
                    // 1 = PLAYING, 2 = PAUSED
                    if (state === 1) setIsPlaying(true);
                    else if (state === 2) setIsPlaying(false);
                  }}
                />
              </div>

              {/* Blocked-embed fallback: replaces the dead player with a clear
                  explanation and a direct link that always works. */}
              {playerBlocked && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 px-6 text-center bg-[#1a1413]/95">
                  <AlertTriangle size={28} className="text-warning-amber" />
                  <div className="space-y-1.5">
                    <p className="font-cormorant text-xl text-stone-100">Video unavailable in this browser</p>
                    <p className="text-xs text-stone-400 font-light max-w-sm leading-relaxed">
                      {playerError ||
                        'Your browser or network is blocking the embedded YouTube player. An ad blocker, privacy extension, or a filtered connection is the usual cause.'}
                    </p>
                  </div>
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs tracking-wider uppercase px-5 py-2.5 transition-all btn-interactive focus-ring"
                  >
                    <ExternalLink size={14} /> Open on YouTube
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setPlayerBlocked(false);
                      setPlayerError('');
                      setIsPlaying(true);
                    }}
                    className="text-[10px] font-mono uppercase tracking-wider text-stone-400 hover:text-stone-200 cursor-pointer focus-ring"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Transparent interaction layer. Pointer events inside a
                  cross-origin iframe never reach the parent document, so
                  without this layer the chrome could not detect cursor
                  activity over the video itself and would retract forever.
                  It sits below the chrome (z-20+) so the buttons stay
                  clickable, and mirrors YouTube: click to play/pause. */}
              {!playerBlocked && (
                <div
                  role="presentation"
                  onClick={() => setIsPlaying((prev) => !prev)}
                  className={`absolute inset-0 z-10 cursor-pointer ${
                    isPlaying ? '' : 'bg-black/30 hover:bg-black/20 transition-colors'
                  }`}
                />
              )}

              {/* Archive + seek-lock chips + fullscreen toggle.
                  Fades out with the rest of the chrome when the pointer idles. */}
              <div
                className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between gap-3 p-4 sm:p-5 transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <span className="font-mono text-[9px] bg-black/60 text-stone-300 px-2.5 py-1 rounded tracking-wider border border-white/10">
                  ETHIO-LINGO ARCHIVE
                </span>
                <div
                  className={`flex items-center gap-2 ${
                    showControls ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                >
                  <span className="hidden sm:inline-flex items-center gap-1.5 bg-primary/90 text-on-primary px-3 py-1 rounded-full text-[10px] font-mono font-semibold tracking-wider shadow-lg">
                    <Lock size={12} />
                    <span>Forward Seek Disabled · 100% Required</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPlaying((prev) => !prev)}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    title={isPlaying ? 'Pause (K)' : 'Play (K)'}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/70 text-stone-200 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer focus-ring"
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-px" />}
                  </button>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                    title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen (F)'}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/70 text-stone-200 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer focus-ring"
                  >
                    {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                  </button>
                </div>
              </div>

              {/* Center play button + stream title.
                  Only while paused: once playback starts the top chrome bar
                  carries the pause button, so the video face stays clear. */}
              {!isPlaying && !playerBlocked && (
              <div
                className={`absolute inset-0 z-20 flex flex-col items-center justify-center text-center gap-4 px-4 transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  aria-label="Play video"
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-2xl ring-4 ring-black/20 transition-transform hover:scale-105 focus-ring cursor-pointer"
                >
                  <Play size={30} className="ml-1" />
                </button>
                <div className="max-w-lg">
                  <div className="font-cormorant text-xl md:text-2xl text-stone-100 leading-snug">{videoTitle}</div>
                  <div className="font-mono text-[9px] text-stone-400 tracking-widest uppercase mt-1.5">
                    Day {currentModuleDay} · {user?.level || 'Beginner I'}
                  </div>
                </div>
              </div>
              )}

              {/* Bottom overlay: progress bar + timing. Retracts with the rest
                  of the chrome so the frame is unobstructed while watching. */}
              <div
                className={`absolute bottom-0 inset-x-0 z-30 p-3.5 pointer-events-none transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-3 space-y-2">
                  <div className="relative w-full h-1.5 bg-stone-700/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-[width] duration-300"
                      style={{ width: `${verificationPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
                    <span className="text-stone-300">
                      {formatTime(lastPlayedSeconds)} / {formatTime(duration)}
                    </span>
                    <span className="text-primary-fixed-dim">
                      {isPlaying ? 'Now Playing' : 'Paused'} · {taskDone ? 'Task Completed' : `Task Verification ${verificationPct}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Task 1 Companion Reference PDF Guide Section */}
          {mode === 'task1' && (
            <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline/50 pb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen size={18} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-cormorant text-xl font-normal text-on-surface">
                      Companion Study Manual
                    </h3>
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                      Reference Guide · PDF
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadReference}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-full text-xs tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer shrink-0"
                >
                  <Download size={14} />
                  <span>Download PDF Reference</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="p-3 bg-success-green/10 border border-success-green/30 text-success-green text-xs rounded-xl font-mono flex items-center gap-2">
                  <CheckCircle size={14} />
                  <span>Reference guide downloaded successfully! Save for exam prep.</span>
                </div>
              )}

              <div
                onClick={handleDownloadReference}
                className="p-4 bg-canvas border border-hairline rounded-xl flex items-center justify-between text-xs font-mono min-w-0 hover:border-primary transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden font-sans">
                    <span
                      className="font-bold text-on-surface block truncate max-w-full text-sm group-hover:text-primary transition-colors"
                      title={refGuideTitle}
                    >
                      {refGuideTitle}
                    </span>
                    <span className="text-on-surface-variant text-xs block truncate mt-0.5">
                      {moduleData?.refGuideDescription || 'PDF Reference Manual • Grammar Rules & Vocabulary Guide'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-primary flex items-center gap-1 shrink-0 ml-2 group-hover:underline">
                  <Download size={14} />
                  <span>Download .pdf</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Syllabus / corner card — Task 1 */}
        {mode === 'task1' && (
          <div className="lg:col-span-4 bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <span className="mono-micro-label text-primary font-semibold">Syllabus Milestones</span>
              <h4 className="font-cormorant text-2xl font-medium text-on-surface mt-2 mb-4">Module {currentModuleDay} Roadmap</h4>
              <div className="flex flex-col gap-3 font-sans text-xs">
                {[
                  { label: '1 · Mandatory Lecture', done: !!dailyTasks.lesson },
                  { label: '2 · Listening Skill', done: !!dailyTasks.video },
                  { label: '3 · Daily Exam', done: !!dailyTasks.exam },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-surface-low rounded-xl flex items-center justify-between gap-2">
                    <span className="font-medium text-on-surface">{item.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${item.done ? 'bg-success-green/15 text-success-green' : 'bg-warning-amber/15 text-warning-amber'}`}>
                      {item.done ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-surface-low rounded-xl">
                <span className="mono-micro-label text-on-surface-variant">Reference Guide</span>
                <p className="text-xs font-medium text-on-surface mt-1.5 truncate" title={refGuideTitle}>
                  {refGuideTitle}
                </p>
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('task2')}
                className="mt-6 w-full py-3 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container transition-all shadow-sm"
              >
                Proceed to Task 2 →
              </button>
            )}
          </div>
        )}

        {/* Listening Lab — Task 2 */}
        {mode === 'task2' && (
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <h3 className="font-cormorant text-2xl md:text-3xl font-normal text-on-surface">Task 2 · Listening Lab Track</h3>
              <div className="bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm p-6">
                <span className="mono-micro-label inline-block bg-primary/10 text-primary px-2 py-1 rounded font-semibold">
                  {listeningCategory === 'informative' ? 'Option A · Informative (Academic)' : 'Option B · Entertainment (Culture)'}
                </span>
                <h4 className="font-cormorant text-2xl font-medium text-on-surface mt-3 leading-snug">{currentVideo.title}</h4>
                <p className="font-sans text-xs text-on-surface-variant mt-2 leading-relaxed">
                  Native-cadence audio stream for {listeningCategory === 'informative' ? 'academic & global English' : 'cultural & storytelling English'} listening practice.
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <span className="mono-micro-label text-primary font-semibold">Audio Stream</span>
                <h4 className="font-cormorant text-2xl font-medium text-on-surface mt-2 mb-6">
                  {user?.level || 'Beginner I'} · Day {currentModuleDay}
                </h4>
                <div className="flex items-center justify-between h-14 px-4 bg-surface-low rounded-xl">
                  {[10, 18, 8, 22, 13, 26, 9, 20, 14].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1.5 bg-primary rounded-full ${i % 3 === 0 ? 'animate-pulse' : ''}`}
                      style={{ height: `${h * 4}px` }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">Cue · Listening</span>
                  {taskDone ? (
                    <span className="text-[10px] font-mono text-success-green uppercase tracking-wider font-semibold">Task Completed</span>
                  ) : (
                    <span className="text-[10px] font-mono text-warning-amber uppercase tracking-wider">Watch Full Track to Unlock</span>
                  )}
                </div>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('task3')}
                  className="mt-6 w-full py-3 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container transition-all shadow-sm"
                >
                  Proceed to Task 3: Daily Exam →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
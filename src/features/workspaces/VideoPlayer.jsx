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
  CheckCircle2,
  Play,
  Pause,
  AlertTriangle,
  ExternalLink,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { useStaking } from '../../context/StakingContext';
import { useSiteContent } from '../../context/SiteContentContext';
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

// How far a single seek control moves the playhead, in seconds.
const SEEK_STEP_SECONDS = 10;

// Window in which a second tap on the same half of the frame counts as a
// double-tap. Long enough for a deliberate double-tap, short enough that two
// unrelated taps do not read as one.
const DOUBLE_TAP_MS = 300;

// How long the "-10s"/"+10s" badge stays on screen after a seek.
const SEEK_FLASH_MS = 650;

// How close to the end counts as finished. Seeking to the exact duration and
// the progress poll both round, so the playhead can land a fraction of a second
// short of the last frame.
const END_OF_VIDEO_TOLERANCE_SECONDS = 1;

const formatTime = (seconds) => {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const VideoPlayer = ({ mode = 'task1', onNavigate }) => {
  const { dailyTasks, completeTask, currentModuleDay, user, isFreeTrialMode, workspaceModule } = useStaking();
  const { c } = useSiteContent();
  const level = user?.level || 'Beginner I';
  const day = currentModuleDay;
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

  // Tap bookkeeping for the double-tap seek zones.
  const lastTapRef = useRef(null);
  const pendingTapRef = useRef(null);
  const seekFlashTimerRef = useRef(null);

  // Latches once the task for this video has been written, so the completion is
  // not sent twice when the end is reported by both a seek and an ENDED event.
  const completionSentRef = useRef(false);

  // Flashes a "-10s"/"+10s" badge over the half of the frame that was tapped.
  const [seekFlash, setSeekFlash] = useState(null);

  // Current playback position. Seeking is unrestricted, so this is just
  // wherever the viewer is in the video.
  const [lastPlayedSeconds, setLastPlayedSeconds] = useState(0);
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

  // Fallbacks are real, verified-embeddable lectures, used whenever the module
  // row has no usable link for that slot (or the module has not loaded yet).
  // extractYouTubeId returns null for anything unparseable, so a blank or
  // malformed admin entry falls through here instead of producing a player with
  // no video.
  const FALLBACK_VIDEO_IDS = {
    lesson: 'dQw4w9WgXcQ',
    informative: 'eIho2S0ZahI',
    entertainment: 'H14bBuluwB8',
  };

  // Materials assigned to the day just arrived (a new currentDay after the
  // midnight rollover) — the playhead and the completion latch must both reset,
  // or the learner would be credited for the previous day's video.
  const moduleId = moduleData?.id;
  useEffect(() => {
    completionSentRef.current = false;
    setDuration(0);
    setPlayedFraction(0);
    setLastPlayedSeconds(0);
    setIsPlaying(false);
  }, [moduleId]);

  const resolveVideoId = (url, fallbackKey) =>
    extractYouTubeId(url) || FALLBACK_VIDEO_IDS[fallbackKey];

  // Dynamic Videos Data from API moduleData
  const videoData = {
    task1: {
      title: moduleData?.title || `${level} • Day ${day} Daily English Lesson`,
      videoId: resolveVideoId(moduleData?.lessonVideoUrl, 'lesson'),
      referenceFile: moduleData?.refGuideTitle || `Birrend_${level.replace(/\s+/g, '_')}_Day${day}_Reference_Guide.pdf`,
    },
    informative: {
      title: `${level} • Listening Practice (Informative: Academic & Global English)`,
      videoId: resolveVideoId(moduleData?.listeningInformativeUrl, 'informative'),
    },
    entertainment: {
      title: `${level} • Listening Practice (Entertainment: Cultural & Storytelling English)`,
      videoId: resolveVideoId(moduleData?.listeningEntertainmentUrl, 'entertainment'),
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
    // A new video has not been completed yet, so release the latch and allow
    // the completion to be written again for this source.
    completionSentRef.current = false;
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

  // 1F. SEEKING: +/- 10s, driven by the arrow buttons on pointer devices and by
  // double-tapping the left/right half of the frame on touch screens. The embed
  // has no native controls of its own here, so without these there is no way to
  // move around the video at all.
  // Flashes the seek badge and schedules its removal. Keyed on a fresh id so
  // two seeks in quick succession restart the timer instead of the first one
  // clearing the second one's badge early.
  const flashSeekBadge = (side) => {
    setSeekFlash({ side, id: Date.now() });
    if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
    seekFlashTimerRef.current = setTimeout(() => {
      seekFlashTimerRef.current = null;
      setSeekFlash(null);
    }, SEEK_FLASH_MS);
  };

  const seekBy = (delta) => {
    const player = playerRef.current;
    if (!player) return;

    const total = player.duration || 0;
    const position = player.currentTime || 0;
    // Seeking is allowed all the way to the end on purpose. Reaching the final
    // frame is what marks the task complete, so clamping just short of it (as
    // an anti-skip measure used to) left a video that could be scrubbed to the
    // finish and still sit at "Pending" forever, because the player never
    // reported the end.
    const upperBound = total > 0 ? total : position + delta;
    const target = Math.max(0, Math.min(position + delta, upperBound));

    revealChrome();

    if (Math.abs(target - position) < 0.05) {
      // Already at that end — flash the badge anyway so the tap is
      // acknowledged instead of looking broken. If that end is the finish,
      // still run the completion check so the tick cannot be missed.
      flashSeekBadge(delta < 0 ? 'back' : 'fwd');
      checkReachedEnd(position, total);
      return;
    }

    player.seekTo(target, true);
    // Move the readout immediately; the next progress poll would otherwise
    // show the old time until the embed catches up.
    setLastPlayedSeconds(target);
    flashSeekBadge(delta < 0 ? 'back' : 'fwd');
    checkReachedEnd(target, total);
  };

  // The single-tap play/pause is deferred by one double-tap window so that a
  // double-tap seek does not also flash the player into the opposite state.
  const handleSurfaceTap = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const side = (event.clientX - bounds.left) / bounds.width < 0.5 ? 'back' : 'fwd';
    const now = Date.now();
    const previous = lastTapRef.current;

    if (previous && now - previous.time < DOUBLE_TAP_MS && previous.side === side) {
      lastTapRef.current = null;
      if (pendingTapRef.current) {
        clearTimeout(pendingTapRef.current);
        pendingTapRef.current = null;
      }
      seekBy(side === 'back' ? -SEEK_STEP_SECONDS : SEEK_STEP_SECONDS);
      return;
    }

    lastTapRef.current = { time: now, side };
    if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
    pendingTapRef.current = setTimeout(() => {
      pendingTapRef.current = null;
      setIsPlaying((prev) => !prev);
    }, DOUBLE_TAP_MS);
  };

  // A pending single-tap toggle must not fire after the component goes away.
  useEffect(
    () => () => {
      if (pendingTapRef.current) clearTimeout(pendingTapRef.current);
      if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
    },
    []
  );

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

  // 1E. PLAYER SHORTCUTS: Left/Right arrows seek +/- 10s, K toggles playback,
  // F toggles fullscreen. The arrow keys are the desktop equivalent of the
  // double-tap seek zones used on touch screens.
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
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekBy(-SEEK_STEP_SECONDS);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekBy(SEEK_STEP_SECONDS);
      } else if (e.code === 'KeyK') {
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

  // 2. TIMER PROGRESS
  const handleProgress = ({ playedSeconds, played, duration: total }) => {
    setPlayedFraction(played);

    // Metadata arriving means the embed is alive and the clock is running.
    if (total > 0) {
      setDuration(total);
      setPlayerBlocked(false);
    }

    // Seeking is unrestricted, so the reported position is simply wherever the
    // viewer left off. The timer tracks that position, not accumulated watch
    // time, so scrubbing backwards also moves the counter backwards.
    setLastPlayedSeconds(playedSeconds);

    // Backstop for the ENDED event: a seek straight onto the final frame does
    // not always produce one, and without this the task would sit at "Pending"
    // on a video that is visibly finished.
    checkReachedEnd(playedSeconds, total);
  };

  // 3. PLAYER LIFECYCLE — reset playback metrics and report errors
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

  // Marking the task complete is driven by "the playhead reached the end",
  // however that happened: watched through, or seeked to the finish. The embed
  // only reports the end reliably when playback runs off the end itself, so the
  // same check also runs on every seek and on every progress poll.
  const handleEnded = () => {
    // ENDED can arrive more than once (a seek onto the final frame fires it,
    // and so does resuming after it), and completeTask writes to the API, so
    // it must not be repeated.
    if (completionSentRef.current) return;
    completionSentRef.current = true;
    setIsPlaying(false);
    if (mode === 'task1') {
      completeTask('lesson');
    } else {
      completeTask('video');
    }
  };

  // True once the playhead is at (or within a fraction of a second of) the very
  // end of a video whose length is known. The tolerance absorbs the rounding
  // that `seekTo(duration)` and the progress poll each introduce.
  const checkReachedEnd = (position, total) => {
    if (!total || total <= 0) return;
    if (position >= total - END_OF_VIDEO_TOLERANCE_SECONDS) handleEnded();
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

  return (
    <div className="space-y-6 transition-colors duration-250">
      {/* Tab Visibility Active Warning Banner */}
      {!isTabActive && (
        <div className="p-3.5 bg-warning-amber/10 border border-warning-amber/30 rounded-xl text-xs text-warning-amber flex items-center justify-between shadow-xs animate-pulse font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              {c('player.autoPaused')}
            </span>
          </div>
        </div>
      )}

      {/* Header Bar with Task Type */}
      <div className="bg-surface-lowest border border-hairline/60 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-1 bg-primary/10 text-primary font-mono text-[9px] font-semibold rounded uppercase tracking-wider">
              {mode === 'task1' ? c('player.task1Badge') : c('player.task2Badge')}
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
              <span>{c('player.taskCompleted')}</span>
            </span>
          ) : (
            <span className="px-4 py-2 bg-surface-container text-on-surface-variant text-[10px] font-semibold font-mono rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              <span>{c('player.watchToUnlock')}</span>
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
            <span>{c('player.informativeLabel')}</span>
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
            <span>{c('player.entertainmentLabel')}</span>
          </button>
        </div>
      )}

      {/* Video frame — lecture / listening stream */}
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
                    <p className="font-cormorant text-xl text-stone-100">{c('player.blockedTitle')}</p>
                    <p className="text-xs text-stone-400 font-light max-w-sm leading-relaxed">
                      {playerError || c('player.blockedBody')}
                    </p>
                  </div>
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs tracking-wider uppercase px-5 py-2.5 transition-all btn-interactive focus-ring"
                  >
                    <ExternalLink size={14} /> {c('player.openOnYoutube')}
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
                    {c('player.tryAgain')}
                  </button>
                </div>
              )}

              {/* Transparent interaction layer. Pointer events inside a
                  cross-origin iframe never reach the parent document, so
                  without this layer the chrome could not detect cursor
                  activity over the video itself and would retract forever.
                  It sits below the chrome (z-20+) so the buttons stay
                  clickable. Single tap mirrors YouTube and toggles playback;
                  double-tapping either half seeks +/- 10s, which is the only
                  way to move around the video on a touch screen. */}
              {!playerBlocked && (
                <div
                  role="presentation"
                  onPointerUp={handleSurfaceTap}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`absolute inset-0 z-10 cursor-pointer touch-manipulation select-none ${
                    isPlaying ? '' : 'bg-black/30 hover:bg-black/20 transition-colors'
                  }`}
                />
              )}

              {/* Double-tap seek badge. Rendered above the interaction layer
                  but below the chrome, so it reads as feedback from the video
                  rather than as another control. */}
              {seekFlash && (
                <div
                  key={seekFlash.id}
                  aria-hidden="true"
                  className={`absolute inset-y-0 z-20 flex items-center pointer-events-none ${
                    seekFlash.side === 'back' ? 'left-0 pl-4 sm:pl-8' : 'right-0 pr-4 sm:pr-8'
                  }`}
                >
                  <span className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-black/70 text-stone-100 font-mono text-xs font-semibold tracking-wider border border-white/10 animate-pulse">
                    {seekFlash.side === 'back' ? <RotateCcw size={14} /> : <RotateCw size={14} />}
                    {SEEK_STEP_SECONDS}s
                  </span>
                </div>
              )}

              {/* Archive chip + fullscreen toggle.
                  Fades out with the rest of the chrome when the pointer idles. */}
              <div
                className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between gap-3 p-4 sm:p-5 transition-opacity duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <span className="font-mono text-[9px] bg-black/60 text-stone-300 px-2.5 py-1 rounded tracking-wider border border-white/10">
                  {c('landing.archiveChip')}
                </span>
                <div
                  className={`flex items-center gap-2 ${
                    showControls ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                >
                  <span className="hidden sm:inline-flex items-center gap-1.5 bg-primary/90 text-on-primary px-3 py-1 rounded-full text-[10px] font-mono font-semibold tracking-wider shadow-lg">
                    <CheckCircle2 size={12} />
                    <span>{c('player.watchedToComplete')}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => seekBy(-SEEK_STEP_SECONDS)}
                    aria-label={`Back ${SEEK_STEP_SECONDS} seconds`}
                    title={`Back ${SEEK_STEP_SECONDS}s`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/70 text-stone-200 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer focus-ring"
                  >
                    <RotateCcw size={15} />
                  </button>
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
                    onClick={() => seekBy(SEEK_STEP_SECONDS)}
                    aria-label={`Forward ${SEEK_STEP_SECONDS} seconds`}
                    title={`Forward ${SEEK_STEP_SECONDS}s`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/70 text-stone-200 hover:bg-primary hover:text-on-primary transition-colors cursor-pointer focus-ring"
                  >
                    <RotateCw size={15} />
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
                    Day {day} · {level}
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
                      {isPlaying ? c('player.nowPlaying') : c('player.paused')} · {taskDone ? c('player.taskCompleted') : c('player.verificationPct', { pct: verificationPct })}
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
                      {c('player.referenceTitle')}
                    </h3>
                    <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                      {c('player.referenceSubtitle')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadReference}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary font-semibold rounded-full text-xs tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm focus-ring btn-interactive cursor-pointer shrink-0"
                >
                  <Download size={14} />
                  <span>{c('player.referenceDownload')}</span>
                </button>
              </div>

              {downloadSuccess && (
                <div className="p-3 bg-success-green/10 border border-success-green/30 text-success-green text-xs rounded-xl font-mono flex items-center gap-2">
                  <CheckCircle size={14} />
                  <span>{c('player.referenceSuccess')}</span>
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
                      {moduleData?.refGuideDescription || c('player.referenceFallbackDesc')}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-primary flex items-center gap-1 shrink-0 ml-2 group-hover:underline">
                  <Download size={14} />
                  <span>{c('player.downloadPdf')}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Syllabus / corner card — Task 1 */}
        {mode === 'task1' && (
          <div className="lg:col-span-4 bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <span className="mono-micro-label text-primary font-semibold">{c('player.syllabusLabel')}</span>
              <h4 className="font-cormorant text-2xl font-medium text-on-surface mt-2 mb-4">{c('player.syllabusTitle', { day })}</h4>
              <div className="flex flex-col gap-3 font-sans text-xs">
                {[
                  { label: c('player.milestone1'), done: !!dailyTasks.lesson },
                  { label: c('player.milestone2'), done: !!dailyTasks.video },
                  { label: c('player.milestone3'), done: !!dailyTasks.exam },
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
                <span className="mono-micro-label text-on-surface-variant">{c('player.referenceGuideLabel')}</span>
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
                {c('player.proceedToTask2')}
              </button>
            )}
          </div>
        )}

        {/* Listening Lab — Task 2 */}
        {mode === 'task2' && (
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <h3 className="font-cormorant text-2xl md:text-3xl font-normal text-on-surface">{c('player.listeningTitle')}</h3>
              <div className="bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm p-6">
                <span className="mono-micro-label inline-block bg-primary/10 text-primary px-2 py-1 rounded font-semibold">
                  {listeningCategory === 'informative' ? c('player.optionA') : c('player.optionB')}
                </span>
                <h4 className="font-cormorant text-2xl font-medium text-on-surface mt-3 leading-snug">{currentVideo.title}</h4>
                <p className="font-sans text-xs text-on-surface-variant mt-2 leading-relaxed">
                  {c('player.listeningBlurb')}
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 bg-surface-lowest rounded-2xl border border-hairline/60 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <span className="mono-micro-label text-primary font-semibold">{c('player.audioStream')}</span>
                <h4 className="font-cormorant text-2xl font-medium text-on-surface mt-2 mb-6">
                  {level} · Day {day}
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
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">{c('player.cueListening')}</span>
                  {taskDone ? (
                    <span className="text-[10px] font-mono text-success-green uppercase tracking-wider font-semibold">Task Completed</span>
                  ) : (
                    <span className="text-[10px] font-mono text-warning-amber uppercase tracking-wider">{c('player.watchToUnlockTrack')}</span>
                  )}
                </div>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('task3')}
                  className="mt-6 w-full py-3 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container transition-all shadow-sm"
                >
                  {c('player.proceedToTask3')}
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
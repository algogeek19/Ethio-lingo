import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
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
} from 'lucide-react';
import { useStaking } from '../../context/StakingContext';
import { api } from '../../services/api';

const getCleanVideoUrl = (rawUrl, defaultUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ') => {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return defaultUrl;
  }
  let cleaned = rawUrl.trim();
  if (cleaned.includes('youtu.be/')) {
    const videoId = cleaned.split('youtu.be/')[1]?.split(/[?#]/)[0];
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  }
  if (cleaned.includes('youtube.com/embed/')) {
    const videoId = cleaned.split('youtube.com/embed/')[1]?.split(/[?#]/)[0];
    if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return cleaned;
};

const VideoPlayer = ({ mode = 'task1' }) => {
  const { dailyTasks, completeTask, currentModuleDay, user, isFreeTrialMode, workspaceModule } = useStaking();
  const playerRef = useRef(null);

  // Playback & Tab Visibility State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);

  // Strict Seeking Lock State (No seeking allowed at all)
  const [lastPlayedSeconds, setLastPlayedSeconds] = useState(0);
  const [seekWarning, setSeekWarning] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Task 2 Category State ('informative' | 'entertainment')
  const [listeningCategory, setListeningCategory] = useState('informative');

  const moduleData = workspaceModule;

  // Dynamic Videos Data from API moduleData
  const videoData = {
    task1: {
      title: moduleData?.title || `${user?.level || 'Beginner I'} • Day ${currentModuleDay} Daily English Lesson`,
      url: getCleanVideoUrl(moduleData?.lessonVideoUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      referenceFile: moduleData?.refGuideTitle || `Birrend_${user?.level?.replace(/\s+/g, '_')}_Day${currentModuleDay}_Reference_Guide.pdf`,
    },
    informative: {
      title: `${user?.level || 'Beginner I'} • Listening Practice (Informative: Academic & Global English)`,
      url: getCleanVideoUrl(moduleData?.listeningInformativeUrl, 'https://www.youtube.com/watch?v=hT_nvWreIhg'),
    },
    entertainment: {
      title: `${user?.level || 'Beginner I'} • Listening Practice (Entertainment: Cultural & Storytelling English)`,
      url: getCleanVideoUrl(moduleData?.listeningEntertainmentUrl, 'https://www.youtube.com/watch?v=7h4gVd3gN7M'),
    },
  };

  const currentVideo =
    mode === 'task1'
      ? videoData.task1
      : listeningCategory === 'informative'
        ? videoData.informative
        : videoData.entertainment;

  const [videoTitle, setVideoTitle] = useState(currentVideo.title);

  useEffect(() => {
    let isMounted = true;
    setVideoTitle(currentVideo.title);

    const loadVideoTitle = async () => {
      try {
        const response = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(currentVideo.url)}`
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
  }, [currentVideo.title, currentVideo.url]);

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

  // 2. STRICT SEEKING LOCK ENFORCEMENT & TIMER PROGRESS
  const handleProgress = (state) => {
    const playedSecs = state.playedSeconds;

    if (playedSecs > lastPlayedSeconds + 1.2) {
      setSeekWarning(true);
      if (playerRef.current) {
        try {
          playerRef.current.seekTo(lastPlayedSeconds, 'seconds');
        } catch (seekErr) {
          console.warn('Seek lock fallback:', seekErr);
        }
      }
      setTimeout(() => setSeekWarning(false), 3000);
      return;
    }

    if (playedSecs > lastPlayedSeconds) {
      setLastPlayedSeconds(playedSecs);
    }
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

  return (
    <div className="space-y-6 transition-colors duration-250">
      {/* Tab Visibility Active Warning Banner */}
      {!isTabActive && (
        <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between shadow-xs animate-pulse font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-warning-amber shrink-0" />
            <span>
              <strong>Playback Auto-Paused:</strong> Tab became inactive. Active focus required to validate task time.
            </span>
          </div>
        </div>
      )}

      {/* Seeking Lock Enforcement Alert */}
      {seekWarning && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-xs text-destructive-red flex items-center justify-between shadow-xs animate-bounce font-mono">
          <div className="flex items-center gap-2">
            <Lock size={18} className="shrink-0" />
            <span>
              <strong>Seeking Restricted:</strong> Fast-forwarding is disabled on mandatory task videos. Returning to played timestamp.
            </span>
          </div>
        </div>
      )}

      {/* Header Bar with Task Type */}
      <div className="bg-surface-lowest border border-hairline rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-surface-dark text-warning-amber font-mono text-[10px] font-bold rounded uppercase">
              {mode === 'task1' ? 'TASK 1: LESSON LECTURE' : 'TASK 2: LISTENING SKILL'}
            </span>
            <span className="text-xs font-mono text-on-surface-variant">
              Day {currentModuleDay} • {user?.level || 'Beginner I'}
            </span>
          </div>
          <h2 className="font-serif font-bold text-xl text-on-surface mt-1">{videoTitle}</h2>
        </div>

        {/* Task Completion Status Badge */}
        <div className="flex items-center gap-2">
          {((mode === 'task1' && dailyTasks.lesson) || (mode === 'task2' && dailyTasks.video)) ? (
            <span className="px-4 py-2 bg-green-500/20 border border-green-500/40 text-success-green text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shadow-xs">
              <CheckCircle size={16} />
              <span>TASK COMPLETED</span>
            </span>
          ) : (
            <span className="px-4 py-2 bg-surface-card border border-hairline text-on-surface-variant text-xs font-semibold font-mono rounded-xl flex items-center gap-1.5">
              <Clock size={16} className="text-primary-coral" />
              <span>WATCH FULL VIDEO TO UNLOCK</span>
            </span>
          )}
        </div>
      </div>

      {/* Task 2 Category Selector (Informative vs Entertainment Choice) */}
      {mode === 'task2' && (
        <div className="bg-surface-card p-1.5 rounded-2xl border border-hairline flex items-center gap-2 max-w-md mx-auto">
          <button
            onClick={() => {
              setListeningCategory('informative');
              setLastPlayedSeconds(0);
              setIsPlaying(false);
            }}
            className={`flex-1 py-2.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer ${
              listeningCategory === 'informative'
                ? 'bg-primary-coral text-white shadow-xs'
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
            className={`flex-1 py-2.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer ${
              listeningCategory === 'entertainment'
                ? 'bg-primary-coral text-white shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Video size={14} />
            <span>Entertainment (Culture)</span>
          </button>
        </div>
      )}

      {/* Video Viewport & ReactPlayer */}
      <div className="bg-stone-950 rounded-2xl overflow-hidden shadow-2xl border border-stone-800 relative group">
        <div className="aspect-video w-full relative">
          <ReactPlayer
            key={currentVideo.url}
            ref={playerRef}
            url={currentVideo.url}
            width="100%"
            height="100%"
            playing={isPlaying && isTabActive}
            controls={false}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onProgress={handleProgress}
            onEnded={handleEnded}
            onStart={() => setIsPlaying(true)}
            onError={(err) => {
              console.warn('ReactPlayer playback warning:', err);
            }}
            progressInterval={500}
            config={{
              youtube: {
                playerVars: {
                  playsinline: 1,
                  modestbranding: 1,
                  rel: 0,
                  origin: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
                },
              },
            }}
          />

          {/* Custom Play Overlay — shown until the video starts */}
          {!isPlaying && (
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              aria-label="Play video"
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors cursor-pointer focus-ring"
            >
              <span className="w-20 h-20 rounded-full bg-primary-coral/95 hover:bg-primary-hover text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>

        {/* Custom Control Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-t border-stone-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying((prev) => !prev)}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className="w-10 h-10 rounded-full bg-primary-coral hover:bg-primary-hover text-white flex items-center justify-center shadow-xs transition-transform hover:scale-105 focus-ring cursor-pointer"
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <span className="text-xs font-mono text-stone-300">
              {isPlaying ? 'Playing…' : 'Paused'} • Watching full video unlocks your daily tasks
            </span>
          </div>
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
            {mode === 'task1' ? 'Task 1 • Lesson' : 'Task 2 • Listening'}
          </span>
        </div>
      </div>

      {/* Task 1 Companion Reference PDF Guide Section */}
      {mode === 'task1' && (
        <div className="bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen size={20} className="text-primary-coral shrink-0" />
              <h3 className="font-serif font-bold text-lg text-on-surface">
                Companion Study Manual & Reference Guide
              </h3>
            </div>

            <button
              onClick={handleDownloadReference}
              className="px-4 py-2 bg-primary-coral hover:bg-primary-hover text-white font-semibold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs focus-ring btn-interactive cursor-pointer shrink-0"
            >
              <Download size={14} />
              <span>Download PDF Reference</span>
            </button>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-green-500/15 border border-green-500/30 text-success-green text-xs rounded-xl font-mono flex items-center gap-2">
              <CheckCircle size={16} />
              <span>Reference guide downloaded successfully! Save for exam prep.</span>
            </div>
          )}

          <div
            onClick={handleDownloadReference}
            className="p-4 bg-canvas border border-hairline rounded-xl flex items-center justify-between text-xs font-mono min-w-0 hover:border-primary-coral transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary-coral/10 text-primary-coral flex items-center justify-center shrink-0 group-hover:bg-primary-coral group-hover:text-white transition-colors">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden font-sans">
                <span
                  className="font-bold text-on-surface block truncate max-w-full text-sm group-hover:text-primary-coral transition-colors"
                  title={moduleData?.refGuideTitle || currentVideo.referenceFile}
                >
                  {moduleData?.refGuideTitle || currentVideo.referenceFile}
                </span>
                <span className="text-on-surface-variant text-xs block truncate mt-0.5">
                  {moduleData?.refGuideDescription || 'PDF Reference Manual • Grammar Rules & Vocabulary Guide'}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-primary-coral flex items-center gap-1 shrink-0 ml-2 group-hover:underline">
              <Download size={14} />
              <span>Download .pdf</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

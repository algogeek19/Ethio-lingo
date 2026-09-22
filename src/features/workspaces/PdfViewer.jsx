import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  BookOpen,
  Download,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useStaking } from "../../context/StakingContext";
import { api } from "../../services/api";

// Supabase Storage Public Bucket Configuration
const SUPABASE_PROJECT_REF = import.meta.env.VITE_SUPABASE_URL
  ? import.meta.env.VITE_SUPABASE_URL.replace("https://", "").replace(".supabase.co", "")
  : "ohiwmjqheitytulhfdpo";
const SUPABASE_BUCKET_NAME = "curriculum-books";

// Programmatic Supabase Storage PDF URL Generator
const generateSupabaseStorageUrl = (urlOrTitle) => {
  if (urlOrTitle && urlOrTitle.startsWith("http")) return urlOrTitle;
  const filename = (urlOrTitle || "book").endsWith(".pdf")
    ? urlOrTitle
    : `${(urlOrTitle || "book").toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf`;

  return `https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${SUPABASE_BUCKET_NAME}/${filename}`;
};

const PdfViewer = () => {
  const { completeTask, dailyTasks, user, isFreeTrialMode, levelBooks } = useStaking();

  const currentLevel = user?.level || "Beginner I";
  const [selectedBook, setSelectedBook] = useState(null);
  // Reading Timer State (20 Minutes = 1200 Seconds required)
  const [accumulatedReadingTime, setAccumulatedReadingTime] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);
  const READING_GOAL_THRESHOLD = 1200; // 20 minutes (1200 seconds) required

  const booksForLevel = levelBooks;

  // Sync selected book when levelBooks updates from StakingContext
  useEffect(() => {
    if (booksForLevel && booksForLevel.length > 0) {
      const b = booksForLevel[0];
      setSelectedBook({
        ...b,
        pdfUrl: generateSupabaseStorageUrl(b.url || b.title),
      });
    }
  }, [booksForLevel]);

  // 1. PAGE VISIBILITY API: Track tab visibility & pause reading timer when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
      } else {
        setIsTabActive(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 2. TIMED READING PROGRESS & AUTO-COMPLETION EFFECT
  useEffect(() => {
    if (dailyTasks.pdf || !isTabActive) return;

    const timerInterval = setInterval(() => {
      setAccumulatedReadingTime((prevTime) => {
        const updatedTime = prevTime + 1;
        if (updatedTime >= READING_GOAL_THRESHOLD) {
          completeTask("pdf", { seconds: updatedTime });
          clearInterval(timerInterval);
        }
        return updatedTime;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [isTabActive, dailyTasks.pdf, completeTask]);

  const handleMarkAsRead = () => {
    setAccumulatedReadingTime(READING_GOAL_THRESHOLD);
    completeTask("pdf", { seconds: READING_GOAL_THRESHOLD });
  };

  const handleSelectBook = (book) => {
    setSelectedBook({
      ...book,
      pdfUrl: generateSupabaseStorageUrl(book.url || book.title),
    });
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleDownloadReference = async (pdfUrl, title) => {
    if (!pdfUrl) return;
    const cleanFileName = `${(title || 'Reference_Book').replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.target = '_blank';
      link.download = cleanFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Visibility Auto-Pause Alert */}
      {!isTabActive && !dailyTasks.pdf && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between shadow-xs animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>
              <strong>Reading Timer Paused:</strong> Tab became hidden. Active
              screen focus required to credit 20-minute reading duration.
            </span>
          </div>
        </div>
      )}

      {/* Book Catalog Header & Reading Timer Progress */}
      <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 bg-[#181715] text-[#e8a55a] font-mono text-[10px] font-bold rounded uppercase">
              TASK 3 • READING SKILL IMPROVEMENT ({currentLevel.toUpperCase()})
            </span>
            <h2 className="font-serif font-bold text-2xl text-[#1b1c1a] mt-1">
              Assigned PDF Books for {currentLevel}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* 20-Minute Timed Reading Timer Counter */}
            <div className="px-4 py-2 bg-white border border-[#e6dfd8] rounded-xl flex items-center gap-2 shadow-xs">
              <Clock size={16} className="text-[#8f482f]" />
              <span className="font-mono text-sm font-bold text-[#1b1c1a]">
                Active Reading Time: {formatTimer(accumulatedReadingTime)} /
                20:00
              </span>
            </div>

            {dailyTasks.pdf ? (
              <span className="px-4 py-2 bg-green-100 border border-green-300 text-green-800 text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shadow-xs">
                <CheckCircle size={16} />
                <span>READING COMPLETED</span>
              </span>
            ) : (
              <button
                onClick={handleMarkAsRead}
                className="px-4 py-2 bg-[#8f482f] hover:bg-[#a9583e] text-white text-xs font-bold font-mono rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Mark Task 3 as completed"
              >
                <CheckCircle size={16} />
                <span>MARK AS READ</span>
              </button>
            )}
          </div>
        </div>

        {/* Level Assigned Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {booksForLevel.map((b) => {
            const isSelected = selectedBook?.id === b.id;
            return (
              <div
                key={b.id}
                onClick={() => handleSelectBook(b)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                  isSelected
                    ? "bg-[#f5f0e8] border-[#8f482f] shadow-sm ring-1 ring-[#8f482f]"
                    : "bg-white border-[#e6dfd8] hover:border-[#8f482f]"
                }`}
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 bg-[#efeeea] text-[#54433e] text-[9px] font-mono font-bold rounded uppercase">
                    {b.category}
                  </span>
                  <h3 className="font-serif font-bold text-sm text-[#1b1c1a] leading-tight">
                    {b.title}
                  </h3>
                  <p className="text-[11px] text-[#54433e] line-clamp-2">
                    {b.description ||
                      `Educational reader assigned for ${currentLevel}.`}
                  </p>
                </div>
                <BookOpen
                  size={18}
                  className={isSelected ? "text-[#8f482f]" : "text-[#6c6a64]"}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded PDF Reader Canvas */}
      <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl overflow-hidden shadow-xl">
        {/* Book Viewport Header */}
        <div className="p-4 bg-[#efeeea] border-b border-[#e6dfd8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-[#8f482f] text-white font-mono text-[10px] font-bold rounded uppercase">
              OFFICIAL COURSE PDF
            </span>
            <div>
              <h3 className="font-serif font-bold text-base text-[#1b1c1a] leading-none">
                {selectedBook?.title || "No book selected"}
              </h3>
              <span className="text-[10px] font-mono text-[#6c6a64]">
                Author: {selectedBook?.author || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs text-[#54433e]">
            {selectedBook?.pdfUrl && (
              <a
                href={selectedBook.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white border border-[#e6dfd8] hover:border-[#8f482f] text-[#1b1c1a] rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Open File Link</span>
              </a>
            )}
          </div>
        </div>

        {/* Embedded Iframe Viewport with #toolbar=0&navpanes=0 */}
        <div className="p-4 bg-stone-900 min-h-[550px]">
          {selectedBook?.pdfUrl ? (
            <iframe
              src={`${selectedBook.pdfUrl}#toolbar=0&navpanes=0`}
              title={selectedBook.title}
              className="w-full h-[550px] border-0 rounded bg-white shadow-inner"
            />
          ) : (
            <div className="w-full h-[550px] flex items-center justify-center text-stone-400 font-mono text-xs">
              No PDF book available for this level.
            </div>
          )}
        </div>

        {/* Course Material Resource & Download Banner */}
        {selectedBook?.pdfUrl && (
          <div className="p-6 bg-white border-t border-[#e6dfd8] space-y-3">
            <div className="p-4 bg-[#f5f0e8] border-l-4 border-[#8f482f] rounded-r-lg text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[#8f482f]">
                  Course Reading Resource:
                </span>
                <p className="text-[#54433e] font-mono text-[11px] mt-0.5 break-all">
                  Title: {selectedBook.title}
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleDownloadReference(selectedBook.pdfUrl, selectedBook.title)}
                  className="px-4 py-2 bg-white border border-[#e6dfd8] hover:border-[#8f482f] text-[#1b1c1a] font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download Reference PDF</span>
                </button>
                <button
                  onClick={handleMarkAsRead}
                  disabled={dailyTasks.pdf}
                  className={`px-4 py-2 font-semibold rounded-lg text-xs transition-colors flex items-center gap-2 shrink-0 shadow-xs ${
                    dailyTasks.pdf
                      ? "bg-green-100 text-green-800 border border-green-300 cursor-default"
                      : "bg-[#8f482f] hover:bg-[#a9583e] text-white cursor-pointer"
                  }`}
                >
                  <CheckCircle size={14} />
                  <span>{dailyTasks.pdf ? "Marked as Read" : "Mark as Read"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;

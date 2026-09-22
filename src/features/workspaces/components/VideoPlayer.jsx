import React, { useState } from 'react';
import { Play, Pause, Volume2, Maximize, CheckCircle, FileText, MessageSquare } from 'lucide-react';

export const VideoPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('notes');
  const [notes, setNotes] = useState([
    'Stochastic calculus is essential for options pricing models in ETB market analysis.',
    'Key takeaway from 14:20: Differential equations describe equilibrium interest rate paths.',
  ]);
  const [newNote, setNewNote] = useState('');

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setNotes([...notes, newNote]);
    setNewNote('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-dark rounded-2xl overflow-hidden shadow-xl border border-stone-800 transition-colors duration-250">
        <div className="relative aspect-video bg-black flex items-center justify-center group">
          <img
            src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=80"
            alt="Course Video"
            className="w-full h-full object-cover opacity-60"
          />

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className="absolute w-20 h-20 rounded-full bg-primary-coral text-white flex items-center justify-center shadow-2xl hover:scale-105 transition-transform focus-ring btn-interactive cursor-pointer"
          >
            {isPlaying ? <Pause size={36} /> : <Play size={36} className="ml-1" />}
          </button>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 flex items-center justify-between text-white font-mono text-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="touch-target focus-ring rounded"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <span>14:20 / 45:00</span>
            </div>
            <div className="flex items-center gap-2">
              <button aria-label="Mute / Unmute" className="touch-target focus-ring rounded">
                <Volume2 size={18} />
              </button>
              <button aria-label="Full screen" className="touch-target focus-ring rounded">
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <span className="text-xs font-mono text-warning-amber uppercase tracking-wider">
                Module 9 • Lecture 2
              </span>
              <h2 className="font-serif font-bold text-2xl text-white mt-1">
                Dynamic Stochastic General Equilibrium Models
              </h2>
            </div>
            <button className="px-4 py-2 bg-success-green/20 text-success-green border border-success-green/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 focus-ring btn-interactive cursor-pointer">
              <CheckCircle size={16} />
              <span>Mark Lesson Complete</span>
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-4 border-b border-stone-800" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'notes'}
                onClick={() => setActiveTab('notes')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors focus-ring ${
                  activeTab === 'notes'
                    ? 'border-primary-coral text-primary-coral'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <MessageSquare size={16} />
                <span>Personal Workspace Notes ({notes.length})</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'transcript'}
                onClick={() => setActiveTab('transcript')}
                className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors focus-ring ${
                  activeTab === 'transcript'
                    ? 'border-primary-coral text-primary-coral'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                <FileText size={16} />
                <span>Interactive Transcript</span>
              </button>
            </div>

            <div className="py-4">
              {activeTab === 'notes' ? (
                <div className="space-y-4">
                  <form onSubmit={handleAddNote} className="flex gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add timestamped note at 14:20..."
                      className="flex-1 bg-stone-900 border border-stone-700 text-stone-100 rounded-xl px-3.5 py-2.5 text-sm focus-ring"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-primary-coral hover:bg-primary-hover text-white text-xs font-semibold rounded-xl btn-interactive focus-ring cursor-pointer"
                    >
                      Save Note
                    </button>
                  </form>
                  <ul className="space-y-2">
                    {notes.map((note, idx) => (
                      <li
                        key={idx}
                        className="p-3.5 bg-stone-900/60 border border-stone-800 rounded-xl text-xs text-stone-300 flex items-start gap-2"
                      >
                        <span className="font-mono text-warning-amber shrink-0">[14:20]</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-xs text-stone-300 leading-relaxed font-mono space-y-3 max-h-60 overflow-y-auto pr-2">
                  <p>
                    <span className="text-warning-amber">[00:00]</span> Welcome back to Advanced Financial Econometrics. Today we examine general equilibrium dynamics...
                  </p>
                  <p>
                    <span className="text-warning-amber">[05:12]</span> Notice how interest rate shocks ripple through the capital allocation framework...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;

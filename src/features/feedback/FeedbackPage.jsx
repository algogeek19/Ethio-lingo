import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Star, Send, CheckCircle2, Info } from 'lucide-react';
import { api } from '../../services/api';
import { useRole } from '../../context/RoleContext';

const CATEGORIES = [
  { value: 'BUG', label: 'Bug / Technical issue' },
  { value: 'CONTENT', label: 'Curriculum content' },
  { value: 'CONTENT', label: 'Exams & scoring' },
  { value: 'CONTENT', label: 'Staking / Payments' },
  { value: 'CONTENT', label: 'Community chat' },
  { value: 'FEATURE', label: 'Feature suggestion' },
  { value: 'OTHER', label: 'Other' },
];

const FeedbackPage = () => {
  const { authUser } = useRole();
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim() || !category || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.submitFeedback({
        category,
        rating: rating || null,
        message: message.trim(),
      });
      setSuccess(true);
      setCategory('');
      setRating(0);
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="bg-surface-dark text-white rounded-2xl p-6 shadow-xl border border-stone-800">
        <span className="text-xs font-mono text-warning-amber uppercase tracking-wider font-bold flex items-center gap-1.5">
          <MessageSquare size={14} /> Learner Feedback
        </span>
        <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white mt-1">Help us improve Ethio-Lingo</h1>
        <p className="text-xs text-stone-400 font-mono mt-0.5">
          Your feedback goes straight to the Birrend team. All reports are reviewed in the admin portal.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-surface-lowest border border-hairline rounded-2xl p-6 space-y-5"
      >
        {success && (
          <div className="p-4 bg-green-500/15 border border-green-500/30 rounded-xl text-sm text-green-700 dark:text-green-300 font-mono flex items-center gap-2">
            <CheckCircle2 size={16} /> Thank you! Your feedback has been submitted successfully.
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-300 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">
              Feedback Category *
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`px-3.5 py-2 rounded-xl border text-xs transition-all cursor-pointer focus-ring ${
                    category === c.value
                      ? 'bg-primary-coral text-white border-primary-coral font-semibold'
                      : 'bg-surface-card text-on-surface-variant border-hairline hover:border-primary-coral'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">
              Overall Rating
            </label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  className="p-1 cursor-pointer focus-ring rounded-lg"
                >
                  <Star
                    size={26}
                    className={`transition-colors ${
                      star <= rating ? 'text-warning-amber fill-warning-amber' : 'text-on-surface-variant'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-xs font-mono text-on-surface-variant">
                  {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Okay' : rating === 2 ? 'Poor' : 'Terrible'}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">
              Your Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={2000}
              required
              placeholder="Tell us what worked well, what didn't, and what you'd love to see next..."
              className="w-full px-4 py-3 bg-surface-card border border-hairline rounded-xl text-sm text-on-surface focus-ring resize-none"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
              <span className="flex items-center gap-1"><Info size={11} /> Submitted as {authUser?.name} ({authUser?.email})</span>
              <span>{message.length} / 2000</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!message.trim() || !category || submitting}
            className="w-full py-3.5 bg-primary-coral hover:bg-primary-hover disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer btn-interactive focus-ring"
          >
            {submitting ? (
              <Send size={14} className="animate-pulse" />
            ) : (
              <Send size={14} />
            )}
            Submit Feedback
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default FeedbackPage;
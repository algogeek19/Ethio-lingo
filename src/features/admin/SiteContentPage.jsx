import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  RotateCcw,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { CONTENT_CATALOG, CONTENT_GROUPS, TOKEN_HELP, defaultContentDocument } from '../../content/catalog';
import { useSiteContent } from '../../context/SiteContentContext';
import { api } from '../../services/api';

/**
 * Site Content CMS.
 *
 * Every field on this page is generated from `CONTENT_CATALOG`, so the admin
 * form and the learner pages can never drift apart: a string that appears in
 * the catalog is editable here by construction, and a string removed from the
 * catalog disappears from here. That is what keeps "all learner-facing content
 * is editable" true as the app grows, rather than a hand-maintained list that
 * quietly falls behind.
 *
 * Editing model: the form holds a working copy seeded from the saved document
 * (layered over the built-in defaults). Saving writes the whole document, so a
 * field the admin deliberately clears falls back to its default on the learner
 * pages instead of persisting an empty string.
 */
const SiteContentPage = () => {
  const { content: liveContent, replaceContent } = useSiteContent();

  const [draft, setDraft] = useState(() => defaultContentDocument());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [message, setMessage] = useState(null);
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState(CONTENT_GROUPS[0]?.key);
  const [onlyChanged, setOnlyChanged] = useState(false);

  // Load the saved document and seed the working copy from it.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getSiteContent();
        const saved = res?.success && res.data?.content ? res.data.content : {};
        const merged = defaultContentDocument();
        for (const [group, fields] of Object.entries(saved)) {
          if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
            merged[group] = { ...merged[group], ...fields };
          }
        }
        if (!cancelled) setDraft(merged);
      } catch (err) {
        if (!cancelled) {
          setMessage({ type: 'error', text: 'Could not load saved content. Showing built-in defaults.' });
          setDraft(defaultContentDocument());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // A field counts as changed when the draft differs from what is currently
  // live, so the "changed only" filter tracks real unsaved work.
  const isChanged = (group, key) => draft?.[group]?.[key] !== liveContent?.[group]?.[key];

  const changedCount = useMemo(() => {
    let total = 0;
    for (const group of Object.keys(CONTENT_CATALOG)) {
      for (const key of Object.keys(CONTENT_CATALOG[group] || {})) {
        if (key.startsWith('_')) continue;
        if (isChanged(group, key)) total += 1;
      }
    }
    return total;
  }, [draft, liveContent]);

  const setField = (group, key, value) => {
    setDraft((prev) => ({
      ...prev,
      [group]: { ...(prev[group] || {}), [key]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.updateSiteContent(draft);
      if (res?.success) {
        // Adopt what the server actually stored, so the "changed" indicators
        // reflect reality rather than what we hoped we sent.
        replaceContent(res.data?.content || draft);
        setSavedAt(new Date());
        const rejected = res.data?.rejectedKeys || [];
        setMessage({
          type: rejected.length ? 'warn' : 'success',
          text: rejected.length
            ? `Saved. ${rejected.length} value(s) were rejected and left unchanged: ${rejected.join(', ')}`
            : 'Site content published. Learner pages pick this up on their next load.',
        });
      } else {
        setMessage({ type: 'error', text: res?.message || 'Save failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || 'Save failed. Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(defaultContentDocument());
    setMessage({ type: 'warn', text: 'Reverted to built-in defaults. Save to publish.' });
  };

  // Filtered field list for the active group.
  const visibleFields = useMemo(() => {
    const fields = CONTENT_CATALOG[activeGroup] || {};
    const needle = query.trim().toLowerCase();
    return Object.entries(fields).filter(([key, spec]) => {
      if (key.startsWith('_')) return false;
      if (onlyChanged && !isChanged(activeGroup, key)) return false;
      if (!needle) return true;
      return (
        key.toLowerCase().includes(needle) ||
        (spec.label || '').toLowerCase().includes(needle) ||
        (spec.default || '').toLowerCase().includes(needle)
      );
    });
  }, [activeGroup, query, onlyChanged, draft, liveContent]);

  const activeGroupLabel = CONTENT_GROUPS.find((g) => g.key === activeGroup)?.label || activeGroup;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-8"
    >
      {/* Header */}
      <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="mono-micro-label text-primary">Content Management System</span>
            <h1 className="font-cormorant text-3xl md:text-4xl text-on-surface mt-1.5">Site Content</h1>
            <p className="text-xs text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
              Every string a learner reads — landing page, learning workspace, video player, dashboard and
              exam room — is editable here. Changes publish immediately to all learners on their next page
              load.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-container text-on-surface font-semibold rounded-full text-xs uppercase tracking-wider border border-hairline transition-colors hover:bg-surface-container-high disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-bold rounded-full text-xs uppercase tracking-wider shadow-sm transition-all hover:bg-primary-container disabled:opacity-50 cursor-pointer"
            >
              <Save size={14} />
              <span>{saving ? 'Publishing…' : `Publish${changedCount ? ` (${changedCount})` : ''}`}</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] font-mono text-on-surface-variant border-t border-hairline/50 pt-3">
          {TOKEN_HELP}
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 border ${
              message.type === 'success'
                ? 'bg-success-green/10 border-success-green/30 text-success-green'
                : message.type === 'warn'
                  ? 'bg-warning-amber/10 border-warning-amber/30 text-warning-amber'
                  : 'bg-destructive-red/10 border-destructive-red/30 text-destructive-red'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 size={14} className="shrink-0" />
            ) : (
              <AlertTriangle size={14} className="shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Group navigation */}
        <div className="lg:col-span-3 space-y-2">
          <div className="bg-surface-container-lowest border border-hairline/60 rounded-2xl p-3 shadow-sm">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all copy…"
                className="w-full pl-9 pr-3 py-2 bg-canvas border border-hairline rounded-lg text-xs text-on-surface placeholder:text-text-muted focus:border-primary outline-none"
              />
            </div>
            <label className="flex items-center gap-2 px-1 pb-3 text-[11px] font-mono text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={onlyChanged}
                onChange={(e) => setOnlyChanged(e.target.checked)}
                className="accent-[var(--color-primary)]"
              />
              <span>Only unsaved changes ({changedCount})</span>
            </label>
            <div className="space-y-1">
              {CONTENT_GROUPS.map((group) => (
                <button
                  key={group.key}
                  onClick={() => setActiveGroup(group.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeGroup === group.key
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-on-surface-variant hover:bg-surface-container border border-transparent'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>

          {savedAt && (
            <div className="p-3 bg-surface-container-lowest border border-hairline/60 rounded-xl text-[11px] font-mono text-on-surface-variant">
              Last published {savedAt.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="lg:col-span-9 space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="font-cormorant text-2xl text-on-surface">{activeGroupLabel}</h2>
            <span className="font-mono text-[10px] text-text-muted">{visibleFields.length} fields</span>
          </div>

          {loading && (
            <div className="p-8 text-center font-mono text-xs text-on-surface-variant animate-pulse">
              Loading saved content…
            </div>
          )}

          {!loading && visibleFields.length === 0 && (
            <div className="p-8 text-center font-mono text-xs text-on-surface-variant bg-surface-container-lowest border border-hairline/60 rounded-2xl">
              No fields match your filters.
            </div>
          )}

          {!loading &&
            visibleFields.map(([key, spec]) => {
              const value = draft?.[activeGroup]?.[key] ?? '';
              const changed = isChanged(activeGroup, key);
              const isTextarea = spec.type === 'textarea';
              return (
                <div
                  key={key}
                  className={`bg-surface-container-lowest border rounded-2xl p-5 shadow-sm space-y-2 transition-colors ${
                    changed ? 'border-primary/40' : 'border-hairline/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="text-xs font-semibold text-on-surface" htmlFor={`field-${activeGroup}-${key}`}>
                      {spec.label || key}
                    </label>
                    <div className="flex items-center gap-2">
                      {changed && (
                        <button
                          onClick={() => setField(activeGroup, key, liveContent?.[activeGroup]?.[key] ?? spec.default ?? '')}
                          className="text-[10px] font-mono text-primary hover:underline cursor-pointer"
                        >
                          Undo
                        </button>
                      )}
                      <code className="text-[10px] font-mono text-text-muted">{key}</code>
                    </div>
                  </div>

                  {isTextarea ? (
                    <textarea
                      id={`field-${activeGroup}-${key}`}
                      value={value}
                      rows={Math.min(8, Math.max(2, Math.ceil((spec.default || '').length / 90)))}
                      onChange={(e) => setField(activeGroup, key, e.target.value)}
                      className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary outline-none font-sans"
                    />
                  ) : (
                    <input
                      id={`field-${activeGroup}-${key}`}
                      value={value}
                      onChange={(e) => setField(activeGroup, key, e.target.value)}
                      className="w-full bg-canvas border border-hairline rounded-lg px-3 py-2 text-xs text-on-surface focus:border-primary outline-none font-sans"
                    />
                  )}

                  {changed && spec.default !== undefined && spec.default !== value && (
                    <p className="text-[10px] font-mono text-on-surface-variant flex items-start gap-1.5">
                      <ExternalLink size={11} className="shrink-0 mt-0.5" />
                      <span>Default: {spec.default}</span>
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </motion.div>
  );
};

export default SiteContentPage;
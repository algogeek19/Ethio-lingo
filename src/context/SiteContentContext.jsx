import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { defaultContentDocument, resolveContent } from '../content/catalog';

const SiteContentContext = createContext(null);

/**
 * Site-wide editable copy.
 *
 * Wraps the catalog in a provider so every learner page can read admin-editable
 * strings through `c('group.key', vars)` instead of hardcoding them. The whole
 * document is fetched once per session and cached in localStorage, because it
 * is public marketing + learning copy that is needed before sign-in and on
 * every page; a round-trip per string would be absurd.
 *
 * Correctness notes:
 *  - The provider always renders the catalog defaults first, then swaps in the
 *    saved document. So a slow, failed, or empty response can never leave the
 *    site blank — it just means the admin has not overridden anything yet.
 *  - A failed read is not retried in a loop; the 30s interval is deliberately
 *    absent because this content changes rarely and the cache is good enough.
 */
const CACHE_KEY = 'birrend_site_content';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.document !== 'object' || parsed.document === null) return null;
    if (Date.now() - (parsed.savedAt || 0) > CACHE_MAX_AGE_MS) return null;
    return parsed.document;
  } catch {
    return null;
  }
};

const writeCache = (document) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ document, savedAt: Date.now() }));
  } catch {
    /* private browsing / quota — the cache is optional */
  }
};

export const SiteContentProvider = ({ children }) => {
  // Start from defaults so the first paint is always complete and correct.
  const [content, setContent] = useState(() => defaultContentDocument());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Paint the cached document immediately if it is fresh, so a returning
      // visitor does not see default copy flash before the network answers.
      const cached = readCache();
      if (cached && !cancelled) setContent(cached);

      try {
        const res = await api.getSiteContent();
        const doc = res?.success && res.data?.content ? res.data.content : null;
        if (cancelled) return;
        if (doc && typeof doc === 'object') {
          // Merge rather than replace: a document saved before a new string
          // was added to the catalog would otherwise drop that string and send
          // it back to its default with no admin override to restore it.
          const merged = { ...defaultContentDocument() };
          for (const [group, fields] of Object.entries(doc)) {
            if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
              merged[group] = { ...merged[group], ...fields };
            }
          }
          setContent(merged);
          writeCache(merged);
        }
      } catch {
        // Keep the defaults (and any cache) — the site must never go blank
        // because the content endpoint is unreachable.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Read one editable string.
   *
   * `vars` fills the `{token}` placeholders. Unknown tokens are left as-is
   * rather than rendering "undefined".
   */
  const c = useCallback(
    (path, vars) => {
      const dot = path.indexOf('.');
      const group = dot === -1 ? path : path.slice(0, dot);
      const key = dot === -1 ? '' : path.slice(dot + 1);
      return resolveContent(content, group, key, vars);
    },
    [content]
  );

  /** Merge an admin-supplied document into state (used after a save). */
  const replaceContent = useCallback((doc) => {
    if (!doc || typeof doc !== 'object') return;
    const merged = { ...defaultContentDocument() };
    for (const [group, fields] of Object.entries(doc)) {
      if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
        merged[group] = { ...merged[group], ...fields };
      }
    }
    setContent(merged);
    writeCache(merged);
  }, []);

  const value = useMemo(() => ({ content, c, loaded, replaceContent }), [content, c, loaded, replaceContent]);

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
};

export const useSiteContent = () => {
  const ctx = useContext(SiteContentContext);
  // Deliberately non-throwing: a page rendered outside the provider must still
  // work, falling back to the catalog defaults via resolveContent.
  return ctx || { content: defaultContentDocument(), c: (p, v) => resolveContent(defaultContentDocument(), p.split('.')[0], p.split('.')[1], v), loaded: false, replaceContent: () => {} };
};
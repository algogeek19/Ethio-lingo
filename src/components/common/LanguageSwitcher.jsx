import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', flag: '🇬🇧' },
  { code: 'am', label: 'አማርኛ', short: 'አማ', flag: '🇪🇹' },
];

const LanguageSwitcher = ({ variant = 'dropdown', className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = i18n.language?.startsWith('am') ? 'am' : 'en';
  const currentLang = LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center bg-surface-soft border border-hairline rounded-full p-1 gap-1 ${className}`}>
        {LANGUAGES.map((lang) => {
          const isSelected = currentLangCode === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary-coral text-white shadow-xs'
                  : 'text-text-muted hover:text-on-surface hover:bg-surface-card'
              }`}
            >
              {lang.short}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch Language"
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-soft hover:bg-surface-card border border-hairline text-on-surface text-xs font-semibold transition-all shadow-2xs hover:border-primary-coral/40 cursor-pointer focus-ring"
      >
        <Globe size={15} className="text-primary-coral" />
        <span className="font-sans">{currentLang.label}</span>
        <ChevronDown
          size={13}
          className={`text-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-36 bg-surface-lowest border border-hairline rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden"
          >
            {LANGUAGES.map((lang) => {
              const isSelected = currentLangCode === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-primary-coral/10 text-primary-coral font-bold'
                      : 'text-on-surface hover:bg-surface-soft'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{lang.label}</span>
                  </span>
                  {isSelected && <Check size={14} className="text-primary-coral" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageSwitcher;

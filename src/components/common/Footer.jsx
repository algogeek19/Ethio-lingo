import React from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, BookOpen, Lock } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-surface-dark text-white pt-16 pb-24 lg:pb-12 border-t border-stone-800 transition-colors duration-250">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Brand & Editorial Philosophy */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-stone-900 border border-stone-700 flex items-center justify-center p-1">
                <img src="/ethiolingo-logo.png" alt="Ethio-Lingo" className="w-full h-full object-contain" />
              </div>
              <span className="font-serif font-bold text-2xl tracking-tight text-white">
                ETHIO-LINGO
              </span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed max-w-md">
              {t('common.tagline', 'Where academic rigor intersects with financial commitment. Ethio-Lingo eliminates superficial learning through high-stakes 30-day stake locking and daily diagnostic accountability.')}
            </p>
            <div className="flex items-center gap-4 text-xs text-stone-500 font-mono">
              <span>EST. 2026</span>
              <span>•</span>
              <span>ADDIS ABABA, ETHIOPIA</span>
            </div>
          </div>

          {/* Pillars */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono text-warning-amber uppercase tracking-wider font-semibold">
              {t('footer.platform', 'Platform Pillars')}
            </h4>
            <ul className="space-y-2 text-sm text-stone-300">
              <li className="flex items-center gap-2">
                <Shield size={14} className="text-primary-coral" />
                <span>Protected Escrow</span>
              </li>
              <li className="flex items-center gap-2">
                <BookOpen size={14} className="text-primary-coral" />
                <span>Rigorous Daily Diagnostics</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock size={14} className="text-primary-coral" />
                <span>30-Day Rollover Cycles</span>
              </li>
            </ul>
          </div>

          {/* Quick Legal / Financial Transparency & Language */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-mono text-warning-amber uppercase tracking-wider font-semibold">
                {t('footer.accountability', 'Transparency')}
              </h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                Non-penalized ETB stakes are fully refundable upon 30-day cycle completion. 
              </p>
            </div>
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block">
                {t('common.language', 'Language')}
              </span>
              <LanguageSwitcher variant="pill" />
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500 font-mono">
          <p>© 2026 Ethio-Lingo Platforms PLC. {t('footer.rights', 'All rights reserved.')}</p>
          <span>{t('footer.madeWith', 'Built for Ethiopian English Learners')}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

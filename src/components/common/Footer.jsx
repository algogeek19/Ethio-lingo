import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-surface-container border-t border-hairline/60 py-14 mt-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 font-sans text-xs text-on-surface-variant">
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
              <img src="/ethiolingo-logo.png" alt="Ethio-Lingo" className="w-5 h-5 object-contain" />
            </div>
            <span className="font-cormorant text-2xl text-on-surface font-medium uppercase tracking-[0.08em]">
              Ethio-Lingo
            </span>
            <span className="text-base text-hairline/70 font-mono hidden sm:inline">|</span>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted hidden sm:inline">
              High-Stakes Academic Contract Protocol
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 font-sans text-xs tracking-wider">
            <Link to="/wallet" className="hover:text-primary transition-colors">
              {t('footer.terms', 'Escrow Terms')}
            </Link>
            <Link to="/wallet" className="hover:text-primary transition-colors">
              {t('footer.ledger', 'Audited Ledger')}
            </Link>
            <Link to="/feedback" className="hover:text-primary transition-colors">
              {t('footer.inquiries', 'Institutional Inquiries')}
            </Link>
            <Link to="/profile" className="hover:text-primary transition-colors">
              {t('footer.disputes', 'Dispute Resolution')}
            </Link>
          </div>

          {/* Language */}
          <LanguageSwitcher variant="pill" />
        </div>

        <div className="pt-6 border-t border-hairline/50 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[10px] text-text-muted">
          <p>© 2026 Ethio-Lingo Platforms PLC. {t('footer.rights', 'All rights reserved.')}</p>
          <span className="tracking-[0.2em] uppercase">
            {t('footer.madeWith', 'Built for Ethiopian English Learners')}
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
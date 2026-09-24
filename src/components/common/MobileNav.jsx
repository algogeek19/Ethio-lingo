import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Layers, Wallet, ShieldCheck, User, Code, MessageCircle } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

const MobileNav = () => {
  const location = useLocation();
  const { role } = useRole();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-canvas/95 backdrop-blur-md border-t border-hairline px-2 py-1 transition-colors duration-250" aria-label="Mobile Navigation">
      <div className="flex items-center justify-around">
        {role === 'learner' ? (
          <>
            <Link
              to="/dashboard"
              aria-label="Learner Dashboard"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/dashboard')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <LayoutDashboard size={20} />
              <span className="mt-0.5">Dash</span>
            </Link>
            <Link
              to="/workspaces"
              aria-label="Learning Workspaces"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/workspaces')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <Layers size={20} />
              <span className="mt-0.5">Learn</span>
            </Link>
            <Link
              to="/exam"
              aria-label="Daily Exam Runner"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/exam')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <BookOpen size={20} />
              <span className="mt-0.5">Exam</span>
            </Link>
            <Link
              to="/chat"
              aria-label="Messenger Chat"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/chat')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <MessageCircle size={20} />
              <span className="mt-0.5">Chat</span>
            </Link>
            <Link
              to="/wallet"
              aria-label="Escrow Vault & Wallet"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/wallet')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <Wallet size={20} />
              <span className="mt-0.5">Wallet</span>
            </Link>
          </>
        ) : role === 'admin' ? (
          <>
            <Link
              to="/admin"
              aria-label="Admin Analytics"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/admin')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <ShieldCheck size={20} />
              <span className="mt-0.5">Analytics</span>
            </Link>
            <Link
              to="/admin/learners"
              aria-label="Learner Directory"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/admin/learners')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <User size={20} />
              <span className="mt-0.5">Learners</span>
            </Link>
            <Link
              to="/admin/community"
              aria-label="Community Moderation"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/admin/community')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <MessageCircle size={20} />
              <span className="mt-0.5">Moderate</span>
            </Link>
            <Link
              to="/admin/curriculum"
              aria-label="Curriculum Admin"
              className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-all rounded-xl focus-ring ${
                isActive('/admin/curriculum')
                  ? 'text-primary-coral font-bold bg-surface-card/60'
                  : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <Code size={20} />
              <span className="mt-0.5">Curriculum</span>
            </Link>
          </>
        ) : null}
      </div>
    </nav>
  );
};

export default MobileNav;

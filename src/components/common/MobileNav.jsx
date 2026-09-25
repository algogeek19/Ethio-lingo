import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Layers, Wallet, ShieldCheck, User, Code, MessageCircle } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

const MobileNav = () => {
  const location = useLocation();
  const { role } = useRole();

  const isActive = (path) => location.pathname === path;

  const learnerItems = [
    { path: '/dashboard', label: 'Dash', icon: LayoutDashboard },
    { path: '/workspaces', label: 'Learn', icon: Layers },
    { path: '/exam', label: 'Exam', icon: BookOpen },
    { path: '/chat', label: 'Chat', icon: MessageCircle },
    { path: '/wallet', label: 'Vault', icon: Wallet },
  ];

  const adminItems = [
    { path: '/admin', label: 'Gov', icon: ShieldCheck },
    { path: '/admin/learners', label: 'Learners', icon: User },
    { path: '/admin/community', label: 'Moderate', icon: MessageCircle },
    { path: '/admin/feedback', label: 'Feedback', icon: BookOpen },
    { path: '/admin/curriculum', label: 'Curriculum', icon: Code },
  ];

  const items = role === 'admin' ? adminItems : learnerItems;
  if (!items.length) return null;

  return (
    <nav
      className="md:hidden fixed bottom-4 left-4 right-4 z-40"
      aria-label="Mobile Navigation"
    >
      <div className="bg-surface/92 backdrop-blur-md border border-hairline/70 rounded-full shadow-xl shadow-stone-900/10 px-2 py-1.5 flex items-center justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={`min-h-[44px] min-w-[52px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-mono tracking-wide transition-all rounded-full focus-ring ${
                active ? 'text-primary font-bold' : 'text-text-muted hover:text-on-surface'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              <span className="uppercase">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
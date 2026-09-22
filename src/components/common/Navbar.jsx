import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Layers,
  Wallet,
  ShieldCheck,
  User,
  Code,
  Sun,
  Moon,
  MessageCircle,
} from "lucide-react";
import { useRole } from "../../context/RoleContext";
import { useStaking } from "../../context/StakingContext";
import { useTheme } from "../../context/ThemeContext";
import StreakBadge from "./StreakBadge";
import LanguageSwitcher from "./LanguageSwitcher";
import { ChapaModal } from "../../features/wallet";

const Navbar = () => {
  const { t } = useTranslation();
  const { authUser, role, isAuthenticated, logout } = useRole();
  const { streak } = useStaking();
  const { isDark, toggleTheme } = useTheme();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-hairline transition-colors duration-250">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left: Editorial Brand Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-3 group focus-ring rounded-xl p-1">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl bg-surface-card border border-hairline flex items-center justify-center p-1.5 shadow-xs group-hover:border-primary-coral/50 transition-colors"
                >
                  <img src="/ethiolingo-logo.png" alt="Ethio-Lingo Logo" className="w-full h-full object-contain" />
                </motion.div>
                <div>
                  <span className="font-serif font-bold text-2xl tracking-tight text-on-surface block leading-none">
                    ETHIO-LINGO
                  </span>
                  <span className="text-[10px] font-mono text-primary-coral uppercase tracking-widest block mt-0.5 font-bold">
                    Financial Escrow Platform
                  </span>
                </div>
              </Link>
            </div>

            {/* Middle: Desktop Animated Nav Links (Hidden on Mobile < 768px) */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium relative" aria-label="Main Navigation">
              {role === "learner" ? (
                <>
                  {[
                    { path: "/dashboard", label: t("nav.dashboard", "Dashboard"), icon: LayoutDashboard },
                    { path: "/workspaces", label: t("nav.workspaces", "Workspaces"), icon: Layers },
                    { path: "/exam", label: t("nav.dailyExam", "Daily Exam"), icon: BookOpen },
                    { path: "/chat", label: t("nav.chat", "Community"), icon: MessageCircle },
                    { path: "/wallet", label: t("nav.wallet", "Escrow Vault"), icon: Wallet },
                  ].map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`relative px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold focus-ring ${
                          active
                            ? "text-primary-coral"
                            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60"
                        }`}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                        {active && (
                          <motion.div
                            layoutId="navbar-active-indicator"
                            className="absolute inset-0 bg-surface-soft border border-primary-coral/30 rounded-xl -z-10"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </>
              ) : role === "admin" ? (
                <>
                  {[
                    { path: "/admin", label: "Admin Analytics", icon: ShieldCheck },
                    { path: "/admin/learners", label: "Learner Directory", icon: User },
                    { path: "/admin/community", label: "Moderation", icon: MessageCircle },
                    { path: "/admin/feedback", label: "Feedback", icon: BookOpen },
                    { path: "/admin/curriculum", label: "Curriculum", icon: Code },
                  ].map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`relative px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold focus-ring ${
                          active
                            ? "text-white"
                            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-card/60"
                        }`}
                      >
                        <Icon size={15} />
                        <span>{item.label}</span>
                        {active && (
                          <motion.div
                            layoutId="navbar-active-indicator-admin"
                            className="absolute inset-0 bg-primary-coral rounded-xl -z-10 shadow-xs"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </>
              ) : null}
            </nav>

            {/* Right: Desktop Actions & Mobile Hamburger Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* DESKTOP-ONLY ACTIONS (Hidden below md 768px) */}
              <div className="hidden md:flex items-center gap-3">
                {role === "learner" && (
                  <StreakBadge count={streak?.count || 0} />
                )}

                {/* Language Switcher */}
                <LanguageSwitcher />

                {/* Theme Toggle Button */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92, rotate: 180 }}
                  onClick={toggleTheme}
                  title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  className="touch-target p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-card rounded-xl transition-colors focus-ring cursor-pointer"
                >
                  {isDark ? (
                    <Sun size={19} className="text-warning-amber" />
                  ) : (
                    <Moon size={19} className="text-on-surface-variant" />
                  )}
                </motion.button>

                {/* User Profile / Auth Surface */}
                {isAuthenticated && authUser ? (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface-card transition-colors border border-transparent hover:border-hairline focus-ring"
                    >
                      <img
                        src={authUser.image || "https://api.dicebear.com/10.x/bottts/svg?seed=nvb41q3y"}
                        alt={authUser.name}
                        className="w-8 h-8 rounded-full border border-hairline object-cover shadow-xs bg-surface-soft"
                      />
                      <div className="text-left leading-tight">
                        <span className="block text-xs font-bold text-on-surface">
                          {authUser.name.split(" ")[0]}
                        </span>
                        <span className="block text-[9px] font-mono text-primary-coral uppercase font-bold">
                          {role}
                        </span>
                      </div>
                    </Link>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={logout}
                      title="Sign Out"
                      aria-label="Sign Out"
                      className="touch-target p-2 text-on-surface-variant hover:text-destructive-red hover:bg-red-500/10 rounded-xl transition-colors focus-ring cursor-pointer"
                    >
                      <LogOut size={16} />
                    </motion.button>
                  </div>
                ) : (
                  <Link
                    to="/auth"
                    className="px-5 py-2.5 bg-primary-coral hover:bg-primary-hover active:bg-primary-active text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 focus-ring btn-interactive"
                  >
                    <span>{t("common.login", "Sign In")}</span>
                  </Link>
                )}
              </div>

              {/* MOBILE ONLY: Hamburger Button (Strictly md:hidden) */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile navigation menu"
                aria-expanded={isMobileMenuOpen}
                className="md:hidden touch-target p-2.5 text-on-surface hover:text-primary-coral rounded-xl bg-surface-card border border-hairline focus-ring cursor-pointer"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer (Strictly md:hidden) */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden border-b border-hairline bg-canvas px-4 py-5 space-y-4 overflow-hidden shadow-2xl"
            >
              {/* User Profile Card inside Mobile Drawer */}
              {isAuthenticated && authUser ? (
                <div className="p-3.5 bg-surface-lowest border border-hairline rounded-2xl flex items-center justify-between">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 focus-ring rounded-xl"
                  >
                    <img
                      src={authUser.image || "https://api.dicebear.com/10.x/bottts/svg?seed=nvb41q3y"}
                      alt={authUser.name}
                      className="w-10 h-10 rounded-full border border-primary-coral object-cover bg-surface-soft"
                    />
                    <div>
                      <span className="block text-sm font-bold text-on-surface">
                        {authUser.name}
                      </span>
                      <span className="block text-[10px] font-mono text-primary-coral uppercase font-bold">
                        {authUser.email} • ({role})
                      </span>
                    </div>
                  </Link>

                  {role === "learner" && (
                    <StreakBadge count={streak?.count || 0} />
                  )}
                </div>
              ) : null}

              {/* Navigation Links inside Mobile Drawer */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider px-2">
                  Navigation Menu
                </span>
                {role === "learner" ? (
                  <>
                    {[
                      { path: "/dashboard", label: t("nav.dashboard", "Learner Dashboard"), icon: LayoutDashboard },
                      { path: "/workspaces", label: t("nav.workspaces", "Learning Workspaces"), icon: Layers },
                      { path: "/exam", label: t("nav.dailyExam", "Daily Exam Runner"), icon: BookOpen },
                      { path: "/chat", label: t("nav.chat", "Community Chat"), icon: MessageCircle },
                      { path: "/wallet", label: t("nav.wallet", "Escrow Vault & Ledger"), icon: Wallet },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-3 text-xs font-bold rounded-xl transition-all focus-ring ${
                            active
                              ? "bg-primary-coral text-white shadow-xs"
                              : "text-on-surface hover:bg-surface-card"
                          }`}
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </>
                ) : role === "admin" ? (
                  <>
                    {[
                      { path: "/admin", label: "Admin Analytics", icon: ShieldCheck },
                      { path: "/admin/learners", label: "Learner Directory", icon: User },
                      { path: "/admin/community", label: "Moderation", icon: MessageCircle },
                      { path: "/admin/feedback", label: "Feedback Inbox", icon: BookOpen },
                      { path: "/admin/curriculum", label: "Curriculum Manager", icon: Code },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-3 text-xs font-bold rounded-xl transition-all focus-ring ${
                            active
                              ? "bg-primary-coral text-white shadow-xs"
                              : "text-on-surface hover:bg-surface-card"
                          }`}
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </>
                ) : (
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 text-xs font-bold text-on-surface hover:bg-surface-card rounded-xl focus-ring"
                  >
                    <BookOpen size={18} />
                    <span>Home Page</span>
                  </Link>
                )}
              </div>

              {/* Language Switcher inside Mobile Drawer */}
              <div className="pt-2 border-t border-hairline flex items-center justify-between px-2">
                <span className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                  <span>{t("common.language", "Language")}</span>
                </span>
                <LanguageSwitcher variant="pill" />
              </div>

              {/* Theme Toggle & Sign In / Sign Out Controls inside Drawer */}
              <div className="pt-2 border-t border-hairline flex flex-col gap-2">
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className="w-full py-3 px-3.5 bg-surface-card hover:bg-surface-high border border-hairline rounded-xl text-xs font-semibold text-on-surface flex items-center justify-between transition-colors focus-ring"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun size={18} className="text-warning-amber" /> : <Moon size={18} className="text-on-surface-variant" />}
                    <span>Theme: {isDark ? "Dark Mode" : "Light Mode"}</span>
                  </span>
                  <span className="text-[10px] font-mono text-primary-coral font-bold uppercase">
                    Toggle
                  </span>
                </button>

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-3 px-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-destructive-red font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors focus-ring cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>{t("common.logout", "Sign Out Account")}</span>
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-3 px-3.5 bg-primary-coral hover:bg-primary-hover text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors focus-ring"
                  >
                    <span>{t("common.login", "Sign In to Ethio-Lingo")}</span>
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Deposit Verification Modal */}
      <ChapaModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
    </>
  );
};

export default Navbar;

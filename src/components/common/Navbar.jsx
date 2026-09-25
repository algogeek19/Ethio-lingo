import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Layers,
  BookOpen,
  Wallet,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";
import { useRole } from "../../context/RoleContext";
import { useStaking } from "../../context/StakingContext";
import { useTheme } from "../../context/ThemeContext";
import { ChapaModal } from "../../features/wallet";

const initials = (name = "") =>
  name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "EL";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { authUser, role, isAuthenticated, logout } = useRole();
  const { streak } = useStaking();
  const { isDark, toggleTheme } = useTheme();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  const langIsAm = (i18n.language || "en").startsWith("am");
  const setLang = (code) => i18n.changeLanguage(code);

  const learnerLinks = [
    { path: "/dashboard", label: t("nav.dashboard", "Dashboard") },
    { path: "/workspaces", label: t("nav.workspaces", "Workspaces") },
    { path: "/exam", label: t("nav.dailyExam", "Daily Exam") },
    { path: "/chat", label: t("nav.chat", "Community") },
    { path: "/wallet", label: t("nav.wallet", "Escrow Vault") },
  ];

  const adminLinks = [
    { path: "/admin", label: "Governance" },
    { path: "/admin/learners", label: "Learners" },
    { path: "/admin/community", label: "Moderation" },
    { path: "/admin/curriculum", label: "Curriculum" },
    { path: "/admin/feedback", label: "Feedback" },
  ];

  const navLinks = role === "admin" ? adminLinks : learnerLinks;

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-40 bg-surface/85 backdrop-blur-md transition-all duration-300 border-b border-hairline/60">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-12 h-20 flex items-center justify-between gap-6">
          {/* Left: Bespoke Brand Mark & Wordmark */}
          <Link to="/" className="flex items-center gap-3.5 group text-left cursor-pointer focus-ring rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform duration-500 group-hover:rotate-12 group-hover:bg-primary/15 overflow-hidden">
              <img src="/ethiolingo-logo.png" alt="Ethio-Lingo Logo" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-cormorant text-2xl tracking-[0.06em] text-on-surface font-medium uppercase leading-none group-hover:text-primary transition-colors">
                Ethio-Lingo
              </span>
              <span className="font-mono text-[9px] tracking-[0.28em] text-primary/80 uppercase font-medium mt-1">
                Academic Escrow
              </span>
            </div>
          </Link>

          {/* Center: Clean, Airy Editorial Navigation Links */}
          <nav
            className="hidden md:flex items-center gap-8 lg:gap-11"
            aria-label="Main Navigation"
          >
            {navLinks.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`font-sans text-[13px] tracking-[0.08em] uppercase relative py-1 transition-colors duration-200 focus-ring ${
                    active
                      ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary"
                      : "text-on-surface-variant/80 font-medium hover:text-on-surface"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Minimalist, Airy Luxury Cluster */}
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-5">
            {/* Quiet Streak Pill */}
            {role === "learner" && (
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high/60 border border-hairline/60 text-[11px] font-mono text-on-surface-variant font-medium"
                title={`${streak?.count || 0} Day Continuous Learning Streak`}
              >
                <span className="text-tertiary text-xs">🔥</span>
                <span className="tracking-wide">
                  {streak?.count || 0} Day{streak?.count === 1 ? "" : "s"}
                </span>
              </div>
            )}

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-on-surface hover:bg-surface-container transition-colors focus-ring cursor-pointer"
            >
              {isDark ? (
                <Sun size={17} className="text-tertiary-fixed-dim" />
              ) : (
                <Moon size={17} />
              )}
            </button>

            {/* Subtle Language Indicator */}
            <div className="hidden lg:flex items-center text-xs tracking-wider text-on-surface-variant font-mono border-x border-hairline px-3.5 gap-2">
              <button
                onClick={() => setLang("en")}
                className={`transition-colors cursor-pointer font-medium ${!langIsAm ? "text-primary font-semibold" : "hover:text-primary text-text-muted"}`}
              >
                EN
              </button>
              <span className="text-stone-300">·</span>
              <button
                onClick={() => setLang("am")}
                className={`transition-colors cursor-pointer font-['Noto_Sans_Ethiopic'] ${langIsAm ? "text-primary font-semibold" : "hover:text-primary text-text-muted"}`}
              >
                አማ
              </button>
            </div>

            {/* Auth cluster (desktop only) */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              {isAuthenticated && authUser ? (
                <>
                  {role === "learner" && (
                    <button
                      onClick={() => setIsDepositOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary font-sans text-xs tracking-[0.06em] font-medium hover:bg-primary-container shadow-sm hover:shadow transition-all duration-200 focus-ring cursor-pointer btn-interactive"
                    >
                      <span>+ Deposit</span>
                    </button>
                  )}
                  <Link
                    to="/profile"
                    aria-label="User Profile"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif font-medium ring-1 ring-hairline hover:ring-primary transition-all focus-ring bg-surface-container overflow-hidden"
                  >
                    {authUser.image ? (
                      <img
                        src={authUser.image}
                        alt={authUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-on-surface">{initials(authUser.name)}</span>
                    )}
                  </Link>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    aria-label="Sign Out"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-destructive-red hover:bg-red-500/10 transition-colors focus-ring cursor-pointer"
                  >
                    <LogOut size={15} />
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary font-sans text-xs tracking-[0.06em] font-medium hover:bg-primary-container shadow-sm hover:shadow transition-all duration-200 focus-ring btn-interactive"
                >
                  <span>{t("common.login", "Sign In")}</span>
                </Link>
              )}
            </div>

            {/* MOBILE ONLY: Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile navigation menu"
              aria-expanded={isMobileMenuOpen}
              className="md:hidden touch-target p-2.5 text-on-surface hover:text-primary rounded-full bg-surface-container/70 border border-hairline/70 focus-ring cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
              className="md:hidden border-b border-hairline/60 bg-canvas/95 backdrop-blur-md px-5 py-6 space-y-5 overflow-hidden shadow-2xl"
            >
              {/* User Profile Card inside Mobile Drawer */}
              {isAuthenticated && authUser ? (
                <div className="p-4 bg-surface-lowest border border-hairline rounded-2xl flex items-center justify-between">
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 focus-ring rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden flex items-center justify-center ring-1 ring-hairline">
                      {authUser.image ? (
                        <img src={authUser.image} alt={authUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-cormorant text-sm text-on-surface">{initials(authUser.name)}</span>
                      )}
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-on-surface">
                        {authUser.name}
                      </span>
                      <span className="block text-[10px] font-mono text-primary uppercase font-medium tracking-wider">
                        {authUser.email}
                      </span>
                    </div>
                  </Link>

                  {role === "learner" && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high/60 border border-hairline/60 text-[11px] font-mono text-on-surface-variant font-medium">
                      <span className="text-tertiary text-xs">🔥</span>
                      <span className="tracking-wide">{streak?.count || 0} Days</span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Navigation Links inside Mobile Drawer */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-semibold text-on-surface-variant uppercase tracking-[0.22em] px-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                  {t("common.menu", "Navigation")}
                </span>
                {navLinks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1">
                    {navLinks.map((item) => {
                      const Icon =
                        item.path === "/dashboard"
                          ? LayoutDashboard
                          : item.path === "/workspaces"
                            ? Layers
                            : item.path === "/exam"
                              ? BookOpen
                              : item.path === "/chat"
                                ? MessageCircle
                                : item.path === "/wallet" || item.path === "/admin"
                                  ? Wallet
                                  : BookOpen;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-3 text-xs font-semibold tracking-wide uppercase rounded-full transition-all focus-ring ${
                            active
                              ? "bg-primary text-on-primary shadow-xs"
                              : "text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <Icon size={16} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <Link
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-3 text-xs font-semibold text-on-surface hover:bg-surface-container rounded-full focus-ring"
                  >
                    <BookOpen size={16} />
                    <span>{t("common.home", "Home")}</span>
                  </Link>
                )}
              </div>

              {/* Language + Theme + Auth inside Drawer */}
              <div className="pt-2 border-t border-hairline/60 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 bg-surface-container/60 border border-hairline/60 rounded-full p-1 w-fit">
                  <button
                    onClick={() => setLang("en")}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-full transition-all cursor-pointer ${!langIsAm ? "bg-surface-lowest text-primary shadow-xs" : "text-text-muted"}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLang("am")}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-full transition-all cursor-pointer ${langIsAm ? "bg-surface-lowest text-primary shadow-xs" : "text-text-muted"}`}
                  >
                    አማ
                  </button>
                </div>

                <button
                  onClick={toggleTheme}
                  className="w-full py-3 px-4 bg-surface-container/60 hover:bg-surface-container-high border border-hairline/60 rounded-full text-xs font-semibold text-on-surface flex items-center justify-between transition-colors focus-ring cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun size={16} className="text-tertiary-fixed-dim" /> : <Moon size={16} className="text-on-surface-variant" />}
                    <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
                  </span>
                  <span className="text-[10px] font-mono text-primary uppercase font-bold">
                    Toggle
                  </span>
                </button>

                {role === "learner" && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsDepositOpen(true);
                    }}
                    className="w-full py-3 px-4 bg-primary text-on-primary rounded-full text-xs font-semibold tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all focus-ring cursor-pointer"
                  >
                    <span>+ Deposit Stake</span>
                  </button>
                )}

                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-destructive-red font-semibold rounded-full text-xs flex items-center justify-center gap-2 transition-colors focus-ring cursor-pointer"
                  >
                    <LogOut size={15} />
                    <span>{t("common.logout", "Sign Out Account")}</span>
                  </button>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full py-3 px-4 bg-primary text-on-primary rounded-full text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors focus-ring"
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
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, Video, Lock, PlusCircle, FileCheck, ArrowRight } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { useStaking } from '../../context/StakingContext';
import { useSiteContent } from '../../context/SiteContentContext';
import CountdownWidget from '../../components/common/CountdownWidget';

const LearningWorkspaces = () => {
  const { dailyTasks, isBalanceZero, isFreeTrialMode, currentModuleDay, user } = useStaking();
  const { c } = useSiteContent();
  const navigate = useNavigate();
  const safeDailyTasks = dailyTasks || { lesson: false, video: false, exam: false };
  const [activeTaskTab, setActiveTaskTab] = useState('task1'); // 'task1' | 'task2' | 'task3'

  const level = user?.level || 'Beginner I';
  const day = currentModuleDay;
  // The free trial runs 7 modules, matching the seeded Free Trial curriculum.
  const trialTotal = 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-8 transition-colors duration-250"
    >
      {/* Real-Time Countdown Timer Widget */}
      <CountdownWidget />

      {/* Lock Screen when Balance is 0 ETB */}
      {isBalanceZero && !isFreeTrialMode ? (
        <div className="p-10 sm:p-12 bg-surface-lowest border border-warning-amber/25 rounded-2xl shadow-sm text-center space-y-5 font-sans my-4">
          <div className="w-16 h-16 rounded-full bg-warning-amber/15 text-warning-amber flex items-center justify-center mx-auto shadow-inner">
            <Lock size={28} />
          </div>
          <div className="space-y-2">
            <span className="mono-micro-label text-primary block">{c('workspaces.lockBadge')}</span>
            <h2 className="font-cormorant text-3xl font-normal text-on-surface">
              {c('workspaces.lockTitle')}
            </h2>
            <p className="text-xs text-on-surface-variant max-w-xl mx-auto leading-relaxed">
              {c('workspaces.lockBody')}
            </p>
          </div>
          <Link
            to="/wallet"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container transition-all shadow-md shadow-primary/20 focus-ring btn-interactive mt-2 cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>{c('workspaces.lockButton')}</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Workspace Header & Task Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-hairline/50 pb-6">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold">
                  {level} · Module {day}
                </span>
                {isFreeTrialMode && (
                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-mono text-[9px] font-semibold rounded-full uppercase tracking-wider">
                    {c('workspaces.freeTrialBadge', { day })}
                  </span>
                )}
              </div>
              <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-2 tracking-tight">
                {isFreeTrialMode
                  ? c('workspaces.titleTrial', { day })
                  : c('workspaces.titleStaked', { level })}
              </h1>
              <p className="text-xs text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
                {c('workspaces.subtitle')}
              </p>
            </div>

            {/* Task Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-surface-container/60 p-1 rounded-full border border-hairline/40 shadow-sm" role="tablist">
              {[
                { id: 'task1', label: c('workspaces.task1Label'), icon: Video, done: safeDailyTasks.lesson },
                { id: 'task2', label: c('workspaces.task2Label'), icon: Play, done: safeDailyTasks.video },
                { id: 'task3', label: c('workspaces.task3Label'), icon: FileCheck, done: safeDailyTasks.exam },
              ].map((tab) => {
                const isActiveTab = activeTaskTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActiveTab}
                    onClick={() => setActiveTaskTab(tab.id)}
                    className={`px-4 py-2 text-xs font-medium rounded-full flex items-center gap-2 transition-all cursor-pointer focus-ring ${
                      isActiveTab
                        ? 'bg-surface-lowest text-on-surface shadow-sm border border-hairline/40'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <Icon size={16} className={isActiveTab ? 'text-primary' : 'text-on-surface-variant'} />
                    <span className="tracking-wide">{tab.label}</span>
                    {typeof tab.done === 'boolean' && (tab.done ? (
                      <span className="px-2 py-0.5 bg-success-green/15 text-success-green text-[9px] font-mono font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle size={11} />
                        <span>{c('workspaces.statusDone')}</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-warning-amber/15 text-warning-amber text-[9px] font-mono font-bold rounded-full uppercase tracking-wider">
                        {c('workspaces.statusPending')}
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated Task Surface */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTaskTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {activeTaskTab === 'task1' && (
                <VideoPlayer mode="task1" onNavigate={() => setActiveTaskTab('task2')} />
              )}
              {activeTaskTab === 'task2' && (
                <VideoPlayer mode="task2" onNavigate={() => setActiveTaskTab('task3')} />
              )}
              {activeTaskTab === 'task3' && (
                <div className="max-w-2xl mx-auto p-8 sm:p-12 bg-surface-lowest border border-hairline/60 rounded-2xl shadow-sm text-center space-y-5 font-sans">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-inner">
                    <FileCheck size={28} />
                  </div>
                  <div className="space-y-2">
                    <span className="mono-micro-label text-primary block">{c('workspaces.examGateBadge')}</span>
                    <h2 className="font-cormorant text-3xl font-normal text-on-surface">
                      {c('workspaces.examGateTitle')}
                    </h2>
                    <p className="text-xs text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                      {c('workspaces.examGateBody')}
                    </p>
                  </div>
                  {safeDailyTasks.exam ? (
                    <div className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-success-green/15 text-success-green text-xs tracking-wider uppercase font-semibold">
                      <CheckCircle size={16} />
                      <span>{c('workspaces.examSealed')}</span>
                    </div>
                  ) : (
                    <Link
                      to="/exam"
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container transition-all shadow-md shadow-primary/20 focus-ring btn-interactive cursor-pointer group"
                    >
                      <span>{c('workspaces.examEnter')}</span>
                      <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  )}
                  <p className="text-[11px] font-mono text-on-surface-variant">
                    {safeDailyTasks.lesson && safeDailyTasks.video
                      ? c('workspaces.examPrereqDone')
                      : c('workspaces.examPrereqLocked')}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

export default LearningWorkspaces;
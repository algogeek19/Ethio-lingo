import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, Video, Lock, PlusCircle, MessageCircle } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import DailyChatPanel from '../chat/DailyChatPanel';
import { useStaking } from '../../context/StakingContext';
import CountdownWidget from '../../components/common/CountdownWidget';

const LearningWorkspaces = () => {
  const { dailyTasks, isBalanceZero, isFreeTrialMode, currentModuleDay, user } = useStaking();
  const safeDailyTasks = dailyTasks || { lesson: false, video: false, exam: false };
  const [activeTaskTab, setActiveTaskTab] = useState('task1'); // 'task1' | 'task2' | 'task3'

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
            <span className="mono-micro-label text-primary block">Escrow Locked · 0 ETB Stake</span>
            <h2 className="font-cormorant text-3xl font-normal text-on-surface">
              Curriculum Workspace Locked
            </h2>
            <p className="text-xs text-on-surface-variant max-w-xl mx-auto leading-relaxed">
              Your lecture videos and listening practice are locked because your active escrow stake balance is 0 ETB. Submit a stake deposit of 1,000 ETB to reactivate daily curriculum access.
            </p>
          </div>
          <Link
            to="/wallet"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container transition-all shadow-md shadow-primary/20 focus-ring btn-interactive mt-2 cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Top Up 1,000 ETB Stake in Escrow Vault →</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Workspace Header & Task Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-hairline/50 pb-6">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-semibold">
                  {user?.level || 'Beginner I'} · Module {currentModuleDay}
                </span>
                {isFreeTrialMode && (
                  <span className="px-2.5 py-0.5 bg-primary/10 text-primary font-mono text-[9px] font-semibold rounded-full uppercase tracking-wider">
                    Free Trial (Day {currentModuleDay} of 3)
                  </span>
                )}
              </div>
              <h1 className="font-cormorant text-4xl md:text-5xl font-normal text-on-surface mt-2 tracking-tight">
                {isFreeTrialMode
                  ? `Dedicated Free Trial Curriculum — Trial Day ${currentModuleDay} of 3`
                  : `Daily Learning Hub (${user?.level || 'Beginner I'})`}
              </h1>
              <p className="text-xs text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
                Complete Task 1 (Lesson Video) and Task 2 (Listening Practice) to unlock the Daily Exam, and join the Daily Chat Room to practice today's topic with learners at your level.
              </p>
            </div>

            {/* Task Navigation Tabs & Daily Chat Room */}
            <div className="flex flex-wrap items-center gap-1 bg-surface-container/60 p-1 rounded-full border border-hairline/40 shadow-sm" role="tablist">
              {[
                { id: 'task1', label: 'Task 1: Lesson Video', icon: Video, done: safeDailyTasks.lesson },
                { id: 'task2', label: 'Task 2: Listening Skill', icon: Play, done: safeDailyTasks.video },
                { id: 'task3', label: 'Daily Chat Room', icon: MessageCircle, done: null },
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
                        <span>Done</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-warning-amber/15 text-warning-amber text-[9px] font-mono font-bold rounded-full uppercase tracking-wider">
                        Pending
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
                <DailyChatPanel roomLevel={isFreeTrialMode ? 'Free Trial' : user?.level} />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};

export default LearningWorkspaces;
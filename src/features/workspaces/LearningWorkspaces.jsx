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
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 transition-colors duration-250"
    >
      {/* Real-Time Countdown Timer Widget */}
      <CountdownWidget />

      {/* Lock Screen when Balance is 0 ETB */}
      {isBalanceZero && !isFreeTrialMode ? (
        <div className="p-12 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl text-center space-y-5 font-sans my-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-warning-amber flex items-center justify-center mx-auto shadow-inner">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="font-serif font-bold text-2xl text-amber-900 dark:text-amber-200">
              Learning Workspaces Locked (0 ETB Stake)
            </h2>
            <p className="text-xs text-amber-800 dark:text-amber-300/80 max-w-xl mx-auto leading-relaxed">
              Your lecture videos and listening practice are locked because your active escrow stake balance is 0 ETB. Submit a stake deposit of 1,000 ETB to reactivate daily curriculum access.
            </p>
          </div>
          <Link
            to="/wallet"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary-coral hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-all shadow-md focus-ring btn-interactive mt-2 cursor-pointer"
          >
            <PlusCircle size={18} />
            <span>Top Up 1,000 ETB Stake in Escrow Vault →</span>
          </Link>
        </div>
      ) : (
        <>
          {/* Workspace Header & Task Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-hairline pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-primary-coral uppercase tracking-wider font-bold">
                  Interactive Learning Workspaces
                </span>
                {isFreeTrialMode && (
                  <span className="px-2.5 py-0.5 bg-primary-coral text-white font-mono text-[10px] font-bold rounded-md uppercase">
                    Free Trial (Day {currentModuleDay} of 3)
                  </span>
                )}
              </div>
              <h1 className="font-serif font-bold text-3xl sm:text-4xl text-on-surface mt-1 tracking-tight">
                {isFreeTrialMode
                  ? `Dedicated Free Trial Curriculum — Trial Day ${currentModuleDay} of 3`
                  : `Daily Learning Hub (${user?.level || 'Beginner I'})`}
              </h1>
              <p className="text-xs text-on-surface-variant mt-1">
                Complete Task 1 (Lesson Video) and Task 2 (Listening Practice) to unlock the Daily Exam, and join the Daily Chat Room to practice today's topic with learners at your level.
              </p>
            </div>

            {/* Task Navigation Tabs & Daily Chat Room */}
            <div className="flex flex-wrap items-center bg-surface-dark p-2 rounded-2xl border border-stone-800 shadow-lg gap-2" role="tablist">
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
                    className={`px-4 py-3 text-xs font-bold rounded-xl flex items-center gap-2.5 transition-all cursor-pointer focus-ring ${
                      isActiveTab
                        ? 'bg-primary-coral text-white shadow-md border-2 border-warning-amber scale-[1.02]'
                        : 'bg-stone-800/90 text-stone-300 hover:bg-stone-700 hover:text-white border border-stone-700'
                    }`}
                  >
                    <Icon size={18} className={isActiveTab ? 'text-warning-amber' : 'text-stone-400'} />
                    <span className="tracking-wide">{tab.label}</span>
                    {typeof tab.done === 'boolean' && (tab.done ? (
                      <span className="px-2 py-0.5 bg-green-500/20 border border-green-400 text-green-300 text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>DONE</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-mono font-bold rounded-full">
                        PENDING
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
              {activeTaskTab === 'task1' && <VideoPlayer mode="task1" />}
              {activeTaskTab === 'task2' && <VideoPlayer mode="task2" />}
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
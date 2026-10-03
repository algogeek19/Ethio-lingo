/**
 * The Site Content catalog.
 *
 * Every learner-facing string that an admin should be able to change lives
 * here exactly once. Three things are generated from this file:
 *
 *   1. the defaults the learner pages render (`c('workspaces.lockTitle')`),
 *   2. the edit form in the admin portal (fields, labels, order, help text),
 *   3. the payload shape saved to the API.
 *
 * Because the admin form is generated from the catalog, adding a new editable
 * string is a one-line change here and it immediately becomes editable in the
 * portal — no migration and no admin UI edit. A key that is present in the
 * catalog but missing from the saved document simply renders its default, so
 * partial saves and hand-edited database rows can never blank the site.
 *
 * Field types:
 *   text    single-line input
 *   textarea  multi-line input
 *   url     single-line input, validated as a URL before saving
 */

/** Tokens a string may interpolate, substituted at render time. */
export const TOKEN_HELP =
  'Tokens are replaced at render time: {level} {day} {nextDay} {nextLevel} {daysLeft} {amount} {pct} {count}';

export const CONTENT_CATALOG = {
  /* ---------------------------------------------------------------- landing */
  landing: {
    _label: 'Landing Page',
    heroBadge: { label: 'Hero badge', default: 'Financial Accountability & Habit Contract Engine' },
    heroTitle: { label: 'Hero title', default: 'Master English.', type: 'textarea' },
    heroTitleAccent: { label: 'Hero title (accent word)', default: 'Not Tomorrow.' },
    heroDescription: {
      label: 'Hero description',
      type: 'textarea',
      default:
        'Daily academic rigor backed by high-stakes escrow. Advance from Beginner I to Advanced II across six 30-day cohorts.',
    },
    heroCtaPrimary: { label: 'Primary button', default: 'Start Placement Assessment' },
    heroCtaSecondary: { label: 'Secondary button', default: 'Explore the Protocol' },
    videoBadge: { label: 'Video section badge', default: 'PROTOCOL EXPLAINER' },
    videoTitle: { label: 'Video section title', default: 'See how the ' },
    videoTitleAccent: { label: 'Video title (accent)', default: 'Academic Escrow' },
    videoTitleEnd: { label: 'Video title (tail)', default: ' Protocol works' },
    videoDescription: {
      label: 'Video description',
      type: 'textarea',
      default:
        'Watch how our daily 3-task curriculum and financial escrow vault keep you accountable, build unbreakable habits, and help you master English.',
    },
    videoFallback: {
      label: 'Video blocked fallback',
      type: 'textarea',
      default: 'This video cannot be played here.',
    },
    videoCta: { label: 'Video blocked button', default: 'Watch on YouTube' },
    videoDuration: { label: 'Video meta line', default: 'PROTOCOL WALKTHROUGH' },
    videoCaption: {
      label: 'Video caption',
      default: 'Complete Walkthrough: Staking, Daily Practice & Withdrawal',
    },
    videoClickToWatch: { label: 'Video poster label', default: 'CLICK TO WATCH' },
    levelsTitle: { label: 'Levels section title', default: 'Six 30-Day ' },
    levelsTitleAccent: { label: 'Levels section title (accent)', default: 'Cohorts' },
    stakingDepositDesc: {
      label: 'Staking section description',
      type: 'textarea',
      default:
        'Deposit 1,000 ETB via Telebirr or Ethiopian Bank Transfer. With a 0% platform fee, 100% of your stake backs your daily commitment.',
    },
    archiveChip: { label: 'Player archive chip', default: 'ETHIO-LINGO ARCHIVE' },
    videoMetaLine: { label: 'Player meta line', default: 'YOUTUBE · 1080P · SEEKING ENABLED' },
    videoOpenCta: { label: 'Video open button (post-play)', default: 'Open on YouTube' },
  },

  /* -------------------------------------------------------------- gallery */
  gallery: {
    _label: 'Landing Feature Cards',
    sectionEyebrow: { label: 'Section eyebrow', default: 'INTERACTIVE PLATFORM JOURNEY' },
    sectionTitle: { label: 'Section title', default: 'The Complete' },
    sectionTitleAccent: {
      label: 'Section title (accent)',
      default: 'Learning & Staking',
    },
    sectionTail: { label: 'Section title (tail)', default: 'Flow' },
    scrollHint: { label: 'Scroll hint', default: 'Scroll ↓' },
    card1Title: { label: 'Card 1 title', default: '10-Question Placement Quiz' },
    card1Subtitle: { label: 'Card 1 subtitle', default: 'ONBOARDING & LEVEL SELECTION' },
    card1Description: {
      label: 'Card 1 description',
      type: 'textarea',
      default:
        'Answer 10 diagnostic English grammar questions during account setup to find your starting level.',
    },
    card1Badge: { label: 'Card 1 badge', default: 'DIAGNOSTIC TEST' },
    card1Stats: { label: 'Card 1 stats', default: 'Score 0-7 → Beginner I | 8-10 → Intermediate I' },
    card2Title: { label: 'Card 2 title', default: 'Academic Escrow Vault' },
    card2Subtitle: { label: 'Card 2 subtitle', default: 'ACCOUNTABILITY LAYER' },
    card2Description: {
      label: 'Card 2 description',
      type: 'textarea',
      default:
        'Lock 1,000 ETB in the escrow vault. Miss a day and the stake is slashed; keep the streak and it stays yours.',
    },
    card2Badge: { label: 'Card 2 badge', default: 'FINANCIAL STAKING' },
    card2Stats: { label: 'Card 2 stats', default: '1,000 ETB locked · -80 ETB per missed day' },
    card3Title: { label: 'Card 3 title', default: 'Daily English Lesson' },
    card3Subtitle: { label: 'Card 3 subtitle', default: 'TASK 1 · MANDATORY' },
    card3Description: {
      label: 'Card 3 description',
      type: 'textarea',
      default:
        'Watch your daily module educational lecture. Includes a downloadable PDF companion guide.',
    },
    card3Badge: { label: 'Card 3 badge', default: 'CURRICULUM' },
    card3Stats: { label: 'Card 3 stats', default: '30 modules per level · 6 levels' },
    card4Title: { label: 'Card 4 title', default: 'Listening Practice' },
    card4Subtitle: { label: 'Card 4 subtitle', default: 'TASK 2 · TWO OPTIONS' },
    card4Description: {
      label: 'Card 4 description',
      type: 'textarea',
      default:
        'Choose an informative academic stream or a cultural storytelling stream and listen at native cadence.',
    },
    card4Badge: { label: 'Card 4 badge', default: 'LISTENING SKILL' },
    card4Stats: { label: 'Card 4 stats', default: 'Informative or Entertainment · 100% to complete' },
    card5Title: { label: 'Card 5 title', default: 'Daily Diagnostic Exam' },
    card5Subtitle: { label: 'Card 5 subtitle', default: 'TASK 3 · ESCROW GATE' },
    card5Description: {
      label: 'Card 5 description',
      type: 'textarea',
      default:
        'Unlocks after Task 1 and Task 2 are finished. Complete 20 multiple-choice questions to advance your streak and protect your money.',
    },
    card5Badge: { label: 'Card 5 badge', default: 'EXAM GATE' },
    card5Stats: { label: 'Card 5 stats', default: 'Passing score is 15/20 (75%)' },
    card6Title: { label: 'Card 6 title', default: 'Passage to Fluency' },
    card6Subtitle: { label: 'Card 6 subtitle', default: 'GRADUATION' },
    card6Description: {
      label: 'Card 6 description',
      type: 'textarea',
      default:
        'Graduate six cohorts, then withdraw your stake and every ETB you never lost along the way.',
    },
    card6Badge: { label: 'Card 6 badge', default: 'WITHDRAWAL' },
    card6Stats: { label: 'Card 6 stats', default: '180 days · stake returned in full' },
    ctaButton: { label: 'Bottom CTA button', default: 'Take Placement Quiz' },
  },

  /* ------------------------------------------------------------- workspace */
  workspaces: {
    _label: 'Learning Workspace',
    lockBadge: { label: 'Lock screen badge', default: 'Escrow Locked · 0 ETB Stake' },
    lockTitle: { label: 'Lock screen title', default: 'Curriculum Workspace Locked' },
    lockBody: {
      label: 'Lock screen body',
      type: 'textarea',
      default:
        'Your lecture videos and listening practice are locked because your active escrow stake balance is 0 ETB. Submit a stake deposit to reactivate daily curriculum access.',
    },
    lockButton: { label: 'Lock screen button', default: 'Top Up 1,000 ETB Stake in Escrow Vault' },
    freeTrialBadge: { label: 'Free trial badge', default: 'Free Trial (Day {day} of 7)' },
    titleStaked: { label: 'Page title (staked)', default: 'Daily Learning Hub ({level})' },
    titleTrial: {
      label: 'Page title (free trial)',
      default: 'Dedicated Free Trial Curriculum — Trial Day {day} of 7',
    },
    subtitle: {
      label: 'Page subtitle',
      type: 'textarea',
      default:
        'Complete Task 1 (Lesson Video) and Task 2 (Listening Practice) to unlock the Daily Exam, then seal Task 3 with a passing score to protect your stake.',
    },
    task1Label: { label: 'Task 1 tab label', default: 'Task 1: Lesson Video' },
    task2Label: { label: 'Task 2 tab label', default: 'Task 2: Listening Skill' },
    task3Label: { label: 'Task 3 tab label', default: 'Task 3: Daily Exam' },
    statusDone: { label: 'Done badge', default: 'Done' },
    statusPending: { label: 'Pending badge', default: 'Pending' },
    examGateBadge: { label: 'Exam gate badge', default: 'Escrow Gate · 20 Questions' },
    examGateTitle: { label: 'Exam gate title', default: 'Task 3: The Daily Exam' },
    examGateBody: {
      label: 'Exam gate body',
      type: 'textarea',
      default:
        'Unlocks only after Task 1 (Lesson Video) and Task 2 (Listening Practice) are sealed. Score at least the passing mark to protect your stake and advance your streak.',
    },
    examSealed: { label: 'Exam sealed badge', default: 'Exam Sealed Today' },
    examEnter: { label: 'Exam enter button', default: 'Enter the Exam Room' },
    examPrereqDone: {
      label: 'Prerequisites met note',
      default: 'Prerequisites complete — the exam gate is open.',
    },
    examPrereqLocked: {
      label: 'Prerequisites locked note',
      default: 'Locked until Task 1 and Task 2 are marked Done.',
    },
  },

  /* ----------------------------------------------------------- video player */
  player: {
    _label: 'Video Player',
    task1Badge: { label: 'Task 1 badge', default: 'Task 1 · Lesson Lecture' },
    task2Badge: { label: 'Task 2 badge', default: 'Task 2 · Listening Skill' },
    taskCompleted: { label: 'Completed badge', default: 'Task Completed' },
    watchToUnlock: { label: 'Incomplete badge', default: 'Watch Full Video to Unlock' },
    informativeLabel: { label: 'Informative tab', default: 'Informative (Academic)' },
    entertainmentLabel: { label: 'Entertainment tab', default: 'Entertainment (Culture)' },
    autoPaused: {
      label: 'Auto-pause warning',
      default: 'Playback Auto-Paused: Tab became inactive. Active focus required to validate task time.',
    },
    blockedTitle: { label: 'Blocked embed title', default: 'Video unavailable in this browser' },
    blockedBody: {
      label: 'Blocked embed body',
      type: 'textarea',
      default:
        'Your browser or network is blocking the embedded YouTube player. An ad blocker, privacy extension, or a filtered connection is the usual cause.',
    },
    openOnYoutube: { label: 'Blocked embed button', default: 'Open on YouTube' },
    tryAgain: { label: 'Blocked embed retry', default: 'Try again' },
    watchedToComplete: { label: 'Chrome completion hint', default: '100% Watched to Complete' },
    nowPlaying: { label: 'Playback state: playing', default: 'Now Playing' },
    paused: { label: 'Playback state: paused', default: 'Paused' },
    verificationPct: { label: 'Verification readout', default: 'Task Verification {pct}%' },
    referenceTitle: { label: 'Reference section title', default: 'Companion Study Manual' },
    referenceSubtitle: { label: 'Reference section subtitle', default: 'Reference Guide · PDF' },
    referenceDownload: { label: 'Download button', default: 'Download PDF Reference' },
    referenceSuccess: {
      label: 'Download success message',
      default: 'Reference guide downloaded successfully! Save for exam prep.',
    },
    referenceFallbackDesc: {
      label: 'Reference file description',
      default: 'PDF Reference Manual • Grammar Rules & Vocabulary Guide',
    },
    downloadPdf: { label: 'Download link label', default: 'Download .pdf' },
    syllabusLabel: { label: 'Syllabus eyebrow', default: 'Syllabus Milestones' },
    syllabusTitle: { label: 'Syllabus title', default: 'Module {day} Roadmap' },
    milestone1: { label: 'Milestone 1', default: '1 · Mandatory Lecture' },
    milestone2: { label: 'Milestone 2', default: '2 · Listening Skill' },
    milestone3: { label: 'Milestone 3', default: '3 · Daily Exam' },
    referenceGuideLabel: { label: 'Reference guide label', default: 'Reference Guide' },
    proceedToTask2: { label: 'Proceed button (task 1)', default: 'Proceed to Task 2' },
    listeningTitle: { label: 'Listening lab title', default: 'Task 2 · Listening Lab Track' },
    optionA: { label: 'Option A chip', default: 'Option A · Informative (Academic)' },
    optionB: { label: 'Option B chip', default: 'Option B · Entertainment (Culture)' },
    listeningBlurb: {
      label: 'Listening blurb',
      default: 'Native-cadence audio stream for listening practice.',
    },
    audioStream: { label: 'Audio stream label', default: 'Audio Stream' },
    cueListening: { label: 'Cue label', default: 'Cue · Listening' },
    watchToUnlockTrack: { label: 'Track incomplete label', default: 'Watch Full Track to Unlock' },
    proceedToTask3: { label: 'Proceed button (task 2)', default: 'Proceed to Task 3: Daily Exam' },
  },

  /* ------------------------------------------------------------- dashboard */
  dashboard: {
    _label: 'Learner Dashboard',
    pausedBadge: { label: 'Paused badge', default: 'Curriculum Paused — Escrow Stake Balance (0 ETB)' },
    pausedBody: {
      label: 'Paused body',
      type: 'textarea',
      default:
        'Your escrow stake balance is 0 ETB. Please submit your deposit verification to reactivate your curriculum access.',
    },
    submitDeposit: { label: 'Submit deposit button', default: 'Submit Stake Deposit' },
    trialCompleteBadge: { label: 'Trial complete badge', default: 'FREE TRIAL COMPLETE' },
    trialActiveBadge: { label: 'Trial active badge', default: '7-DAY FREE TRIAL ACTIVE' },
    trialActiveBody: {
      label: 'Trial active body',
      default:
        'You are exploring the dedicated free trial curriculum ({daysLeft} Days Left). Target Staked Track: {level}.',
    },
    trialCompleteBody: {
      label: 'Trial complete body',
      default:
        'You have completed your free trial! Deposit 1,000 ETB to unlock Day 1 of {level}.',
    },
    trialDepositButton: {
      label: 'Trial deposit button',
      default: 'Deposit ETB 1,000 to Start Day 1 of {level}',
    },
    workspaceTitle: { label: 'Workspace card title', default: 'Scholar Workspace' },
    welcome: { label: 'Welcome line', default: 'Welcome back, {name}' },
    trialPhase: { label: 'Trial phase line', default: 'Free Trial Phase ({daysLeft} Days Left)' },
    progressLine: {
      label: 'Curriculum progress line',
      default:
        '30-Day Curriculum Progress: Day {day} of 30 ({level}) — mandatory daily verification closes at 23:59 EAT.',
    },
    vaultSecured: { label: 'Vault card title', default: 'Escrow Vault Secured' },
    riskExam: { label: 'Risk row label', default: 'Risk: -ETB 25 / Exam' },
    daysStreak: { label: 'Streak row label', default: 'Days Streak' },
    allTasksSealed: { label: 'All tasks sealed', default: 'All 3 Tasks Sealed' },
    tasksRemaining: { label: 'Tasks remaining', default: '{count} Task(s) Remaining' },
    tasksRemainingBody: {
      label: 'Tasks remaining body',
      type: 'textarea',
      default: 'Sealing task 3/3 secures today’s stake and streak.',
    },
    dayMastered: { label: 'Day mastered badge', default: 'DAY {day} MASTERED' },
    allTasksCompleted: { label: 'All tasks completed title', default: 'All 3 Tasks Completed! Day {day} Secured' },
    daySecuredBody: {
      label: 'Day secured body',
      type: 'textarea',
      default:
        'Your daily stake is safe and streak is protected. Day {nextDay} unlocks when the midnight countdown reaches zero.',
    },
    nextDayUnlocks: { label: 'Next day unlock badge', default: 'Day {nextDay} Unlocks at Midnight' },
    dailyMandate: { label: 'Tasks card title', default: 'Daily Mandate' },
    todaysTasks: { label: 'Tasks card subtitle', default: 'Day {day}: Today’s 3 Mandatory Tasks' },
    streakRule: {
      label: 'Streak rule note',
      type: 'textarea',
      default: 'Continuous daily streak increments only when all 3 tasks are completed.',
    },
    tasksLockedTitle: {
      label: 'Tasks locked title',
      default: 'Daily Learning Tasks Locked (0 ETB Stake)',
    },
    tasksLockedBody: {
      label: 'Tasks locked body',
      type: 'textarea',
      default:
        'Your curriculum tasks are locked because your active escrow stake balance is 0 ETB. Submit a stake deposit to reactivate daily lecture videos and exams.',
    },
    topUpButton: { label: 'Top up button', default: 'Top Up 1,000 ETB Stake in Escrow Vault' },
    task1Label: { label: 'Task 1 card badge', default: 'Task 1 · Lesson Video' },
    watchLessonVideo: { label: 'Task 1 button', default: 'Watch Lesson Video' },
    riskLabel: { label: 'Risk label', default: 'Risk: -ETB 25' },
    examScoreNote: { label: 'Exam score note', default: 'Score 15/20 (75%) to pass.' },
    tasksCompletedCount: {
      label: 'Tasks completed counter',
      default: '({count} / 3 Completed)',
    },
    task2Title: { label: 'Task 2 card title', default: 'Listening Lab' },
    task3Title: { label: 'Task 3 card title', default: 'Daily Exam' },
    verifiedWatched: { label: 'Verified badge', default: 'Verified Watched' },
    videoWorkspace: { label: 'Video workspace label', default: 'Video Workspace' },
    openLesson: { label: 'Open lesson button', default: 'Open Lesson' },
    reviewLesson: { label: 'Review lesson button', default: 'Review Lesson' },
    comprehensionVerified: { label: 'Comprehension badge', default: 'Comprehension Verified' },
    replayAudio: { label: 'Replay audio button', default: 'Replay Audio' },
    watchVideo: { label: 'Watch video button', default: 'Watch Video' },
    reviewExam: { label: 'Review exam button', default: 'Review Exam' },
    beginExam: { label: 'Begin exam button', default: 'Begin Exam' },
    feedbackTitle: { label: 'Feedback card title', default: 'Share Your Feedback' },
    submitFeedback: { label: 'Submit feedback button', default: 'Submit Feedback' },
    streakSuccessToast: {
      label: 'All-tasks-complete toast',
      default: 'All 3 daily tasks complete! Streak advanced today.',
    },
  },

  /* ------------------------------------------------------------------ exam */
  exam: {
    _label: 'Daily Exam',
    adminNotice: {
      label: 'Admin notice',
      default: 'Admin accounts do not take daily diagnostic exams or maintain escrow stakes.',
    },
    zeroBalanceLock: {
      label: 'Zero balance lock',
      default:
        'Your daily exam is locked because your active escrow stake balance is 0 ETB. Submit a deposit to reactivate exams.',
    },
    lockedNotice: {
      label: 'Locked notice',
      type: 'textarea',
      default:
        'Daily exam is locked. Please complete your daily workspace tasks first.',
    },
    lockedBadge: { label: 'Locked badge', default: 'Daily Exam Locked' },
    lockedTitle: { label: 'Locked title', default: 'Complete the Workspace Videos First' },
    goToDashboard: { label: 'Go to admin button', default: 'Go to Admin Dashboard' },
    topUpVault: { label: 'Top up vault button', default: 'Top Up Escrow Stake in Vault' },
    openWorkspaces: { label: 'Open workspaces button', default: 'Open Learning Workspaces' },
    backToDashboard: { label: 'Back button', default: 'Back to Dashboard' },
    headerBadge: { label: 'Header badge', default: 'Escrow at Stake' },
    headerMeta: { label: 'Header meta', default: '· {count} Questions · {pct}% Pass Required' },
    headerTitle: { label: 'Header title', default: 'Daily Diagnostic Exam ({level})' },
    headerSubtitle: {
      label: 'Header subtitle',
      default:
        'Module Day {day} — threshold {threshold}/20 ({pct}%) — drops to 10/20 (50%) after 3 attempts',
    },
    penaltyLabel: { label: 'Penalty label', default: 'Penalty for Failure' },
    timeRemaining: { label: 'Time remaining label', default: 'Time Remaining' },
    questionOf: { label: 'Question counter', default: 'Question {count} of {total}' },
    answeredOf: { label: 'Answered counter', default: 'Answered: {count} / {total}' },
    selectAnswerWarning: {
      label: 'Select answer warning',
      default: 'Please select an answer option above to proceed to the next question.',
    },
    previous: { label: 'Previous button', default: 'Previous' },
    next: { label: 'Next button', default: 'Next Question' },
    dismiss: { label: 'Dismiss link', default: 'Dismiss' },
    grading: { label: 'Grading button', default: 'Grading Assessment...' },
    submit: { label: 'Submit button', default: 'Submit & Seal Exam' },
    sampleQuestion: { label: 'Fallback sample question', default: 'Sample Question' },
    submitFailed: { label: 'Submit failure message', default: 'Failed to submit exam. Please try again.' },
    submitError: {
      label: 'Submit error message',
      default: 'An error occurred while submitting your exam. Please try again.',
    },
    passedBadge: { label: 'Passed badge', default: 'Exam Closed & Record Locked' },
    failedBadge: { label: 'Failed badge', default: 'Assessment Result' },
    passedTitle: { label: 'Passed title', default: 'Daily Exam Passed!' },
    failedTitle: { label: 'Failed title', default: 'Exam Failed — ETB {amount} Penalty Slashed' },
    scoreAchieved: { label: 'Score line', default: 'Score achieved:' },
    thresholdLine: { label: 'Threshold line', default: 'Passing threshold:' },
    adaptiveNote: {
      label: 'Adaptive threshold note',
      default: '(adaptive bar active after 3 attempts)',
    },
    streakLabel: { label: 'Streak label', default: 'Current Learner Streak:' },
    streakSuffix: { label: 'Streak suffix', default: 'Day Streak' },
    passSuccess: {
      label: 'Pass success message',
      type: 'textarea',
      default:
        'Passing criteria met. Module Day {day} complete! Streak updated and exam is officially closed for this module. Day {nextDay} unlocks at midnight.',
    },
    passLevelComplete: {
      label: 'Level complete message',
      default:
        'Level {level} Mastered (30/30 Days Complete)! {nextLevel} is now available.',
    },
    passTrialComplete: {
      label: 'Trial complete message',
      type: 'textarea',
      default:
        'Congratulations! You have completed your Free Trial! Deposit 1,000 ETB to unlock Day 1 of {level} on the Staked Escrow Tier.',
    },
    passTrialPartial: {
      label: 'Trial partial message',
      default: 'Free Trial Day {day} of 7 Passed! Day {nextDay} of 7 unlocks.',
    },
    failThreshold: {
      label: 'Failure threshold message',
      default: 'Score below the passing threshold ({threshold}/20 required).',
    },
    failIncomplete: {
      label: 'Failure incomplete message',
      type: 'textarea',
      default: 'Task 3 remains INCOMPLETE and a retake is required. A penalty was deducted from your escrow stake.',
    },
    retake: { label: 'Retake button', default: 'Retake Exam Required' },
    reviewResults: { label: 'Review results button', default: 'Review Exam Results' },
    returnDashboard: { label: 'Return button', default: 'Return to Dashboard' },
    mistakesReview: { label: 'Mistakes review heading', default: 'Review your incorrect answers' },
    yourAnswerLabel: { label: 'Your answer label', default: 'Your answer' },
    correctAnswerLabel: { label: 'Correct answer label', default: 'Correct answer' },
    explanationLabel: { label: 'Explanation label', default: 'Explanation' },
    trialDepositButton: {
      label: 'Trial deposit button (exam room)',
      default: 'Deposit ETB 1,000 to Start Day 1 of {level}',
    },
    unlockNextDay: { label: 'Unlock next day badge', default: 'Day {nextDay} Unlocks at Midnight' },
    advanceLevel: { label: 'Advance level button', default: 'Advance to {nextLevel} (Day 1)' },
  },

  /* --------------------------------------------------------------- chrome */
  nav: {
    _label: 'Navigation & Footer',
    navDashboard: { label: 'Nav: Dashboard', default: 'Dashboard' },
    navWorkspaces: { label: 'Nav: Workspaces', default: 'Workspaces' },
    navExam: { label: 'Nav: Daily Exam', default: 'Daily Exam' },
    navCommunity: { label: 'Nav: Community', default: 'Community' },
    navVault: { label: 'Nav: Escrow Vault', default: 'Escrow Vault' },
    countdownLabel: { label: 'Countdown label', default: 'Commitment Window Countdown' },
    countdownTz: { label: 'Countdown timezone', default: 'Africa / Addis Ababa (UTC+3)' },
    countdownHeader: {
      label: 'Countdown header',
      default: 'Streak & Escrow Expiration Countdown:',
    },
    countdownNextDay: {
      label: 'Countdown next-day badge',
      default: 'Day {nextDay} Unlocks at Midnight Countdown',
    },
    countdownFooterLocked: {
      label: 'Countdown footer (incomplete)',
      type: 'textarea',
      default: 'Complete all 3 daily workspace tasks before midnight to protect your stake.',
    },
    countdownFooterDone: {
      label: 'Countdown footer (complete)',
      default: 'All 3 daily tasks completed! Day {nextDay} unlocks when the midnight countdown reaches zero.',
    },
    footerRights: { label: 'Footer rights', default: 'All rights reserved.' },
    footerCompany: { label: 'Footer company', default: 'Ethio-Lingo Platforms PLC' },
    footerTerms: { label: 'Footer: Terms link', default: 'Escrow Terms' },
    footerLedger: { label: 'Footer: Audited Ledger', default: 'Audited Ledger' },
    footerInquiries: { label: 'Footer: Institutional Inquiries', default: 'Institutional Inquiries' },
    footerDisputes: { label: 'Footer: Dispute Resolution', default: 'Dispute Resolution' },
    footerMadeWith: {
      label: 'Footer: tagline',
      default: 'Built for Ethiopian English Learners',
    },
    countdownIncomplete: {
      label: 'Countdown incomplete badge',
      default: 'DAY {day} TASKS INCOMPLETE',
    },
    countdownDayComplete: {
      label: 'Countdown day-complete badge',
      default: 'DAY {day} COMPLETED',
    },
    countdownLevelComplete: {
      label: 'Countdown level-complete badge',
      default: 'LEVEL {level} COMPLETED',
    },
    countdownDayDone: {
      label: 'Countdown day-done title',
      default: 'Day {day} Mastered! Stake Safe & Streak Secured.',
    },
    countdownLevelDone: {
      label: 'Countdown level-done title',
      default: 'Level {level} Mastered! 30/30 Days Complete.',
    },
    countdownTransition: {
      label: 'Countdown transition badge',
      default: 'Transitioning to {nextLevel} (Day 1) at Midnight',
    },
    countdownTransitionNote: {
      label: 'Countdown transition note',
      default: 'Transitioning to Day 1 of {nextLevel} when countdown reaches zero.',
    },
  },
};

/** Group keys in display order, with their human-readable titles. */
export const CONTENT_GROUPS = Object.entries(CONTENT_CATALOG)
  .filter(([, fields]) => Object.keys(fields).some((k) => !k.startsWith('_')))
  .map(([key, fields]) => ({ key, label: fields._label || key }));

/**
 * Flatten the catalog into the plain `{ group: { key: string } }` document the
 * API stores. Values are the built-in defaults; the admin form layers the saved
 * document on top and writes the result back.
 */
export const defaultContentDocument = () => {
  const doc = {};
  for (const [group, fields] of Object.entries(CONTENT_CATALOG)) {
    doc[group] = {};
    for (const [key, spec] of Object.entries(fields)) {
      if (key.startsWith('_')) continue;
      doc[group][key] = spec.default ?? '';
    }
  }
  return doc;
};

/**
 * Resolve a catalog key to its editable value.
 *
 * Looks the key up in the saved document first and falls back to the catalog
 * default, so a key that was never saved — or a whole group the admin has not
 * touched — still renders correct copy. Placeholders are substituted last, and
 * any token without a supplied value is left untouched rather than printing
 * "undefined" at a learner.
 */
export const resolveContent = (document, group, key, vars) => {
  const saved = document?.[group]?.[key];
  const template =
    typeof saved === 'string' && saved.length > 0 ? saved : CONTENT_CATALOG[group]?.[key]?.default ?? '';
  if (!template) return '';
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, token) =>
    vars[token] === undefined || vars[token] === null ? match : String(vars[token])
  );
};
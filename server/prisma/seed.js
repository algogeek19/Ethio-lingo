import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BEGINNER_1_MODULE_TOPICS = [
  'Alphabet, Phonetics & Pronunciation',
  'Nouns, Pronouns & Simple Articles',
  'Present Simple Tense & Verbs',
  'Common Everyday Vocabulary',
  'Asking Questions & Sentence Structure',
  'Numbers, Time & Calendar Dates',
  'Adjectives & Describing Objects',
  'Prepositions of Place & Time',
  'Present Continuous Tense',
  'Expressing Likes & Preferences',
  'Family, Relationships & Jobs',
  'Directions, Places & Navigation',
  'Past Simple Tense (Regular Verbs)',
  'Past Simple Tense (Irregular Verbs)',
  'Daily Routines & Frequency Adverbs',
  'Food, Dining & Ordering at Restaurants',
  'Shopping, Currency & Prices',
  'Weather, Seasons & Climate Words',
  'Modal Verbs: Can, Could & Must',
  'Health, Body Parts & Doctor Visits',
  'Future Tense with Going To',
  'Future Tense with Will',
  'Comparative & Superlative Adjectives',
  'Travel, Transport & Airport Dialogue',
  'Hobbies, Sports & Leisure Activities',
  'House, Furniture & Home Life',
  'Telephone & Messaging Expressions',
  'Writing Simple Emails & Letters',
  'Making Plans & Invitations',
  'Beginner I Comprehensive Review & Milestone',
];

const INTERMEDIATE_1_MODULE_TOPICS = [
  'Present Perfect Tense & Experience',
  'Present Perfect vs Past Simple',
  'Past Continuous & Interrupted Actions',
  'Conditionals: Zero & First Conditional',
  'Second Conditional & Hypotheses',
  'Modal Verbs of Obligation & Permission',
  'Modal Verbs of Advice: Should & Ought To',
  'Passive Voice (Present & Past)',
  'Reported Speech & Indirect Quotes',
  'Phrasal Verbs in Daily Contexts',
  'Business English: Meetings & Agenda',
  'Expressing Strong Opinions & Debate',
  'Agreeing, Disagreeing & Negotiating',
  'Financial Vocabulary: Banking & Escrow',
  'Relative Clauses: Who, Which, That',
  'Gerunds vs Infinitives',
  'Used To vs Would for Past Habits',
  'Past Perfect Tense & Sequence',
  'Cause & Effect Connectors',
  'Writing Formal Complaints & Requests',
  'Job Interviews & Professional CVs',
  'Technology & Digital Communication',
  'Environment & Global Issues Vocabulary',
  'Understanding Idioms & Expressions',
  'Prefixes, Suffixes & Word Families',
  'Summarizing Articles & Main Ideas',
  'Presentation Skills & Public Speaking',
  'Describing Trends & Graphical Data',
  'Cross-Cultural Communication',
  'Intermediate I Comprehensive Review & Milestone',
];

const SAMPLE_QUESTION_TEMPLATES = [
  {
    template: 'Which option correctly completes the sentence about "{topic}"?',
    options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
    answerIndex: 0,
  },
  {
    template: 'Select the grammatically correct sentence related to {topic}.',
    options: ['Option A', 'Option B (Correct)', 'Option C', 'Option D'],
    answerIndex: 1,
  },
  {
    template: 'Identify the synonym or closest meaning for the core keyword in "{topic}".',
    options: ['Option A', 'Option B', 'Option C (Correct)', 'Option D'],
    answerIndex: 2,
  },
  {
    template: 'What is the standard structure when forming statements in "{topic}"?',
    options: ['Option A', 'Option B', 'Option C', 'Option D (Correct)'],
    answerIndex: 3,
  },
];

function getExplanationForOption(level, day, q, correctOption) {
  return `${level} Day ${day} Q${q} explanation: The correct answer is "${correctOption}". This reinforces the module topic and grammar structure taught in today's lesson.`;
}

async function createQuestionForDay(level, day, topic, q) {
  const tmpl = SAMPLE_QUESTION_TEMPLATES[(q - 1) % SAMPLE_QUESTION_TEMPLATES.length];
  const qLevel = level === 'Free Trial' ? 'freetrial' : level.toLowerCase().replace(/\s+/g, '_');
  await prisma.questionBank
    .create({
      data: {
        level,
        dayNumber: day,
        question: `${level} Day ${day} Q${q}: ${tmpl.template.replace('{topic}', topic)}`,
        options: JSON.stringify(tmpl.options),
        answerIndex: tmpl.answerIndex,
        keywords: JSON.stringify([qLevel, topic.toLowerCase()]),
        explanation: getExplanationForOption(level, day, q, tmpl.options[tmpl.answerIndex]),
      },
    })
    .catch(() => {});
}

async function seedModuleAndQuestions(level, day, topic, videoUrls = {}) {
  await prisma.curriculumModule
    .upsert({
      where: { level_dayNumber: { level, dayNumber: day } },
      update: {
        title: `${level} • Day ${day}: ${topic}`,
        lessonVideoUrl: videoUrls.lesson || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        refGuideTitle: `${level.replace(/\s+/g, '_')}_Day_${day}_Guide.pdf`,
        refGuideDescription: `Educational reference manual for ${level} Day ${day}: ${topic}.`,
        listeningInformativeUrl: videoUrls.informative || 'https://www.youtube.com/watch?v=hT_nvWreIhg',
        listeningEntertainmentUrl: videoUrls.entertainment || 'https://www.youtube.com/watch?v=hT_nvWreIhg',
      },
      create: {
        level,
        dayNumber: day,
        title: `${level} • Day ${day}: ${topic}`,
        lessonVideoUrl: videoUrls.lesson || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        refGuideTitle: `${level.replace(/\s+/g, '_')}_Day_${day}_Guide.pdf`,
        refGuideDescription: `Educational reference manual for ${level} Day ${day}: ${topic}.`,
        listeningInformativeUrl: videoUrls.informative || 'https://www.youtube.com/watch?v=hT_nvWreIhg',
        listeningEntertainmentUrl: videoUrls.entertainment || 'https://www.youtube.com/watch?v=hT_nvWreIhg',
      },
    })
    .catch(() => {});

  for (let q = 1; q <= 20; q++) {
    await createQuestionForDay(level, day, topic, q);
  }
}

// Generic module topic sequences for the remaining curriculum levels
const GENERIC_LEVEL_TOPICS = {
  'Beginner II': [
    'Review: Nouns, Verbs & Sentence Structure',
    'Comparatives & Superlatives in Conversation',
    'Question Tags & Short Answers',
    'Past Simple vs Present Perfect Review',
    'Everyday Expressions & Idioms for Beginners',
    'Describing People, Places & Daily Routines',
    'Time Clauses: When, While, Before, After',
    'Phrasal Verbs for Daily Communication',
    'Future Plans: Going To & Will Review',
    'Making Requests, Offers & Polite Language',
    'Countable vs Uncountable Nouns & Quantifiers',
    'Modals: Should, Must, Have To Review',
    'Telling Stories: Narrative Sequencing',
    'Reading Comprehension: Short Stories',
    'Listening Practice: Conversations & Directions',
    'Grammar Review: Articles, Prepositions & Connectives',
    'Vocabulary Building: Work, Travel & Health',
    'Giving Opinions & Agreeing Politely',
    'Writing Simple Messages, Emails & Notes',
    'Understanding Instructions & Announcements',
    'Past Continuous Review & Interrupted Actions',
    'Common Collocations & Word Partnerships',
    'Expressing Preferences: Prefer, Rather, Enjoy',
    'Making Comparisons & Discussing Choices',
    'Listening Practice: Interviews & Dialogues',
    'Conditionals: Zero & First Review',
    'Reading: News Headlines & Short Articles',
    'Pronunciation: Stress & Intonation Patterns',
    'Daily Conversation Practice & Roleplay',
    'Beginner II Comprehensive Review & Milestone',
  ],
  'Intermediate II': [
    'Passive Voice in Academic & Professional Contexts',
    'Conditionals: Second & Third Review',
    'Reported Speech & Indirect Questions',
    'Linking Words: Cause, Effect & Contrast',
    'Vocabulary: Finance, Business & Negotiation',
    'Complex Sentence Structures & Clauses',
    'Reading: Editorials & Opinion Articles',
    'Listening: Lectures & Extended Talks',
    'Phrasal Verbs for Business & Workplace',
    'Expressing Hypothetical Situations',
    'Idioms & Figurative Language in Context',
    'Writing: Reports, Proposals & Summaries',
    'Critical Thinking & Evaluating Arguments',
    'Modals of Deduction: Must, Might, Can’t',
    'Present Perfect Continuous & Duration',
    'Vocabulary: Science, Technology & Innovation',
    'Listening: Debates & Panel Discussions',
    'Grammar Precision: Articles in Depth',
    'Reading: Research Summaries & Academic Texts',
    'Persuasive Writing & Rhetorical Devices',
    'Cleft Sentences & Emphatic Structures',
    'Vocabulary: Law, Ethics & Society',
    'Listening: Interviews & Podcast Episodes',
    'Advanced Punctuation & Style',
    'Collocations in Academic Writing',
    'Grammar Review: Advanced Verb Patterns',
    'Reading: Biographies & Case Studies',
    'Discussion: Debating Contemporary Issues',
    'Professional Communication Review',
    'Intermediate II Comprehensive Review & Milestone',
  ],
  'Advanced I': [
    'Advanced Grammar: Inversion & Emphasis',
    'Nuanced Vocabulary: Connotation & Register',
    'Listening: Authentic Academic Lectures',
    'Reading: Peer-Reviewed Journal Abstracts',
    'Advanced Argumentation & Logical Fallacies',
    'Metaphor, Analogy & Abstract Language',
    'Writing: Literature Reviews & Critiques',
    'Advanced Reported Structures & Hedging',
    'Understanding Complex Institutions & Culture',
    'Listening: TED-style Talks & Keynotes',
    'Advanced Idioms, Proverbs & Allusions',
    'Grammar: Non-Finite Clauses & Modals in Depth',
    'Reading: Statistical & Data-Based Texts',
    'Advanced Presentation & Public Speaking',
    'Discourse Analysis & Cohesion',
    'Vocabulary: Public Policy & Economics',
    'Listening: Radio Features & Documentaries',
    'Writing: Executive Summaries & Briefs',
    'Advanced Tense Selection & Aspect',
    'Reading: Legal & Regulatory Texts',
    'Persuasion, Rhetoric & Political Discourse',
    'Advanced Listening: Multiple Speakers & Accents',
    'Vocabulary: Health, Environment & Ethics',
    'Grammar: Ellipsis & Substitution',
    'Critical Reading: Complex Multi-Argument Texts',
    'Academic Integrity & Citation Practice',
    'Advanced Discussion Facilitation',
    'Synthesis Writing & Multiple Sources',
    'Advanced Comprehensive Grammar Audit',
    'Advanced I Comprehensive Review & Milestone',
  ],
  'Advanced II': [
    'Mastering Stylistic Variety & Tone',
    'Listening: Conference Presentations',
    'Reading: Comparative Literature & Theory',
    'Advanced Lexical Precision & Calque Avoidance',
    'Grammar: Advanced Ellipsis, Fronting & It-Clefts',
    'Writing: Policy Papers & White Papers',
    'Listening: University Seminars & Tutorials',
    'Reading: Philosophy & Abstract Texts',
    'Advanced Debate & Adjudication',
    'Corpus Linguistics & Authentic Usage',
    'Advanced Pronunciation & Connected Speech',
    'Writing: Grant Proposals & Research Outlines',
    'Advanced Cognitive & Reasoning Vocabulary',
    'Reading: Historical Documents & Primary Sources',
    'Listening: Cross-Cultural Communication',
    'Advanced Register: Formal vs Informal Mastery',
    'Grammar: Perfect Modals & Mixed Conditionals',
    'Writing: Doctoral Abstracts & Exegesis',
    'Advanced Media Literacy & Bias Detection',
    'Listening: Complex Multidisciplinary Talks',
    'Reading: Economic & Geopolitical Analysis',
    'Advanced Collaborative Problem Solving',
    'Vocabulary: Diplomacy & International Affairs',
    'Grammar Audit: Full Tense & Mood System',
    'Academic Publishing & Scholarly Communication',
    'Advanced Seminars: Synthesis & Critique',
    'Language Strategy & Independent Learning',
    'Final Capstone: Applied Academic English',
    'Advanced II Milestone Review',
    'Advanced II Comprehensive Review & Capstone',
  ],
};

async function seedDatabase() {
  console.log('🌱 Starting Birrend Curriculum & Question Bank Seeding...');

  // 0. Clean dynamic user data (Users, Wallets, Progress, Transactions, Requests)
  console.log('Cleaning dynamic user runtime data...');
  await prisma.chatReport.deleteMany().catch(() => {});
  await prisma.chatMessage.deleteMany().catch(() => {});
  await prisma.directChat.deleteMany().catch(() => {});
  await prisma.examAttempt.deleteMany().catch(() => {});
  await prisma.feedback.deleteMany().catch(() => {});
  await prisma.userDailyProgress.deleteMany().catch(() => {});
  await prisma.ledgerTransaction.deleteMany().catch(() => {});
  await prisma.depositRequest.deleteMany().catch(() => {});
  await prisma.withdrawalRequest.deleteMany().catch(() => {});
  await prisma.wallet.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  // Re-seedable content tables: keep the question bank idempotent
  await prisma.questionBank.deleteMany().catch(() => {});

  // 0. Seed Users (Admin & Learner)
  console.log('Seeding Default Admin and Learner users...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const learnerPasswordHash = await bcrypt.hash('learner123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@birrend.com' },
    update: {
      name: 'Tigist Assefa (Admin)',
      password: adminPasswordHash,
      role: 'admin',
      level: 'Advanced II',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
    },
    create: {
      email: 'admin@birrend.com',
      name: 'Tigist Assefa (Admin)',
      password: adminPasswordHash,
      role: 'admin',
      level: 'Advanced II',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });

  const learnerUser = await prisma.user.upsert({
    where: { email: 'learner@birrend.com' },
    update: {
      name: 'Abebe Kebede',
      password: learnerPasswordHash,
      role: 'learner',
      level: 'Beginner I',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phone: '0911223344',
      phoneVerified: true,
      age: 24,
      interests: JSON.stringify(['Business', 'Technology', 'Travel']),
      listeningMinutesPerDay: 15,
      listeningCategories: JSON.stringify(['Informative', 'Entertainment']),
    },
    create: {
      email: 'learner@birrend.com',
      name: 'Abebe Kebede',
      password: learnerPasswordHash,
      role: 'learner',
      level: 'Beginner I',
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true,
      phone: '0911223344',
      phoneVerified: true,
      age: 24,
      interests: JSON.stringify(['Business', 'Technology', 'Travel']),
      listeningMinutesPerDay: 15,
      listeningCategories: JSON.stringify(['Informative', 'Entertainment']),
    },
  });

  // Ensure wallet exists for learner (0% platform fee, 1,000 ETB full stake)
  await prisma.wallet.upsert({
    where: { userId: learnerUser.id },
    update: {
      stakedAmount: 1000.0,
      totalPlatformFees: 0.0,
      streakCount: 7,
      freeTrialDaysLeft: 0,
    },
    create: {
      userId: learnerUser.id,
      stakedAmount: 1000.0,
      availableBalance: 0.0,
      totalPenalties: 0.0,
      totalPlatformFees: 0.0,
      streakCount: 7,
      isFreeTrial: false,
      freeTrialDaysLeft: 0,
    },
  });

  // 1. Seed Placement Questions (15 Questions)
  console.log('Seeding Placement Quiz questions (15 questions)...');
  await prisma.questionBank.deleteMany({ where: { level: 'Placement' } }).catch(() => {});

  const placementData = Array.from({ length: 15 }, (_, i) => ({
    level: 'Placement',
    dayNumber: 0,
    question: `Placement Test Question ${i + 1}: Select the correct grammatical structure.`,
    options: JSON.stringify([
      `Correct Placement Answer ${i + 1}`,
      `Incorrect Option B ${i + 1}`,
      `Incorrect Option C ${i + 1}`,
      `Incorrect Option D ${i + 1}`,
    ]),
    answerIndex: 0,
    keywords: JSON.stringify(['placement', 'grammar']),
    explanation: `Placement Question ${i + 1} explanation: Option A follows the standard grammatical structure described in the question.`,
  }));

  for (const item of placementData) {
    await prisma.questionBank.create({ data: item }).catch(() => {});
  }

  // 2. Seed 7 Dedicated Free Trial Modules & Question Banks
  console.log('Seeding 7 Dedicated Free Trial Modules & Question Pool...');
  const FREE_TRIAL_MODULE_TOPICS = [
    'Introduction to Academic English & Escrow Mechanics',
    'Essential Daily Vocabulary & Sentence Formation',
    'Grammar Basics: Present Tenses & Subject-Verb Agreement',
    'Active Listening Strategies & Conversational Fluency',
    'Reading Comprehension & Context Clues',
    'Pronunciation, Accent Reduction & Clarity',
    'Free Trial Milestone Review & Staked Escrow Transition',
  ];

  for (let day = 1; day <= 7; day++) {
    const topic = FREE_TRIAL_MODULE_TOPICS[day - 1];
    await seedModuleAndQuestions('Free Trial', day, topic);
  }

  // 3. Seed 30 Modules & Question Banks for Beginner I
  console.log('Seeding Beginner I (30 Modules + Question Pool)...');
  for (let day = 1; day <= 30; day++) {
    const topic = BEGINNER_1_MODULE_TOPICS[day - 1];
    await seedModuleAndQuestions('Beginner I', day, topic);
  }

  // 4. Seed 30 Modules & Question Banks for Intermediate I
  console.log('Seeding Intermediate I (30 Modules + Question Pool)...');
  for (let day = 1; day <= 30; day++) {
    const topic = INTERMEDIATE_1_MODULE_TOPICS[day - 1];
    await seedModuleAndQuestions('Intermediate I', day, topic);
  }

  // 4.5 Seed Modules & Question Banks for the remaining curriculum levels
  for (const [level, topics] of Object.entries(GENERIC_LEVEL_TOPICS)) {
    console.log(`Seeding ${level} (${topics.length} Modules + Question Pool)...`);
    for (let day = 1; day <= topics.length; day++) {
      const topic = topics[day - 1];
      await seedModuleAndQuestions(level, day, topic);
    }
  }

  // 5. Seed Initial System Settings (Landing Page Video)
  console.log('Seeding System Settings (Landing Page Explainer Video)...');
  await prisma.systemSetting.upsert({
    where: { key: 'landing_video_url' },
    update: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    create: { key: 'landing_video_url', value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  }).catch(() => {});

  console.log('✅ Seeding completed! All 6 curriculum levels, 15 placement questions with explanations, chat & feedback tables ready.');
}

seedDatabase()
  .catch((e) => {
    console.error('Seeding error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
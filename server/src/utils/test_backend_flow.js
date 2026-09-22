import { getPlacementQuizQuestions, evaluatePlacementQuiz, registerUser } from '../services/authService.js';
import { getDailyWorkspaceData, updateTaskCompletion } from '../services/workspaceService.js';
import { getDailyExamQuestions, submitExamAnswers } from '../services/examService.js';
import { initializePayment, verifyPayment } from '../services/paymentService.js';
import { validateQuestionBankJSON } from '../services/adminService.js';
import { prisma } from '../config/database.js';

async function runBackendVerificationTests() {
  console.log('\n=======================================================');
  console.log('🧪 BIRREND BACKEND FUNCTIONAL VERIFICATION SUITE');
  console.log('=======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extraInfo = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName} ${extraInfo}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${extraInfo}`);
      failed++;
    }
  }

  try {
    // Register a real test user to ensure foreign key constraints pass in PostgreSQL DB
    const testEmail = `test_runner_${Date.now()}@birrend.com`;
    let testUser = await registerUser({
      name: 'Verification Test User',
      email: testEmail,
      password: 'password123',
      level: 'Beginner I',
      role: 'learner',
    }).then((res) => res.user).catch(() => null);

    if (!testUser) {
      testUser = await prisma.user.findFirst({ where: { role: 'learner' } }).catch(() => ({
        id: 'usr_learner_001',
        email: 'learner@birrend.com',
        role: 'learner',
        level: 'Beginner I',
      }));
    }

    const userId = testUser.id;

    // Test 1: Placement Quiz Random Sampling
    const placementQuestions = await getPlacementQuizQuestions();
    assert(
      Array.isArray(placementQuestions) && placementQuestions.length === 10,
      'Test 1: Placement Quiz Questions Fetch',
      `(Count: ${placementQuestions.length})`
    );

    // Test 2: Placement Evaluation Logic
    const highPlacement = await evaluatePlacementQuiz(userId, Array(10).fill(0));
    assert(
      highPlacement.evaluatedLevel === 'Intermediate I' && highPlacement.score === 10,
      'Test 2A: High Placement Score -> Intermediate I',
      `(Level: ${highPlacement.evaluatedLevel})`
    );

    const lowPlacement = await evaluatePlacementQuiz(userId, [0, 1, 2, 3, 1, 2, 3, 1, 2, 3]);
    assert(
      lowPlacement.evaluatedLevel === 'Beginner I',
      'Test 2B: Low Placement Score -> Beginner I',
      `(Level: ${lowPlacement.evaluatedLevel})`
    );

    // Test 3: Workspace Task Retrieval
    const workspace = await getDailyWorkspaceData(userId, 'Beginner I', 1);
    assert(
      workspace && workspace.module && (workspace.module.level === 'Beginner I' || workspace.module.level === 'Free Trial'),
      'Test 3: Daily Workspace Data Retrieval'
    );

    // Test 4: Exam Lock Guard (Before completing tasks)
    let lockGuardTriggered = false;
    try {
      await getDailyExamQuestions(userId, 'Beginner I', 1);
    } catch (err) {
      if (err.statusCode === 403) {
        lockGuardTriggered = true;
      }
    }
    assert(
      lockGuardTriggered,
      'Test 4: Exam Lock Guard Blocks Fetch when Workspace Tasks are Incomplete'
    );

    // Test 5: Complete Tasks & Unlock Exam
    await updateTaskCompletion(userId, 'Beginner I', 1, 'task1');
    await updateTaskCompletion(userId, 'Beginner I', 1, 'task2');
    await updateTaskCompletion(userId, 'Beginner I', 1, 'task3', { seconds: 1200 });

    const unlockedExam = await getDailyExamQuestions(userId, 'Beginner I', 1);
    assert(
      Array.isArray(unlockedExam) && unlockedExam.length === 20,
      'Test 5: Exam Unlocked & 20 Random Questions Fetched After Tasks Completed',
      `(Questions: ${unlockedExam.length})`
    );

    // Test 6: Exam Submission Grading (Pass >= 15)
    const answersObj = unlockedExam.map((q) => ({ questionId: q.id, selectedOption: q.answerIndex }));
    const passedExam = await submitExamAnswers(userId, 'Beginner I', 1, answersObj);
    assert(
      passedExam.passed === true && passedExam.score === 20,
      'Test 6: Exam Grading (20/20 Correct -> Passed)'
    );

    // Test 7: Payment Mock Initialization & Verification Engine
    const initPay = await initializePayment(userId, { amount: 1000.0 });
    assert(
      initPay && initPay.txRef && initPay.checkoutUrl,
      'Test 7A: Chapa Payment Initialization Mock',
      `(txRef: ${initPay.txRef})`
    );

    const verifiedPay = await verifyPayment(userId, initPay.txRef);
    assert(
      verifiedPay && verifiedPay.status === 'success' && verifiedPay.netStakeAdded === 900.0,
      'Test 7B: Payment Verification & 10% Fee Deduction (1000 ETB deposit -> 900 ETB net stake)',
      `(Net Stake: ${verifiedPay.netStakeAdded} ETB)`
    );

    // Test 8: Admin Question Bank Import JSON Validation
    const validJSON = [
      {
        question: 'What is the correct form of the verb to be?',
        options: ['is', 'are', 'am', 'was'],
        answerIndex: 0,
        level: 'Beginner I',
        dayNumber: 1,
      },
    ];
    const validRes = validateQuestionBankJSON(validJSON);
    assert(Array.isArray(validRes), 'Test 8A: Valid Question Bank JSON Import Structure Accepted');

    let corruptJSONRejected = false;
    try {
      validateQuestionBankJSON([{ invalidField: true }]);
    } catch (err) {
      corruptJSONRejected = true;
    }
    assert(corruptJSONRejected, 'Test 8B: Corrupted Question Bank JSON Structure Rejected with Validation Error');

  } catch (err) {
    console.error('Fatal Error during verification tests:', err);
    failed++;
  }

  console.log('\n=======================================================');
  console.log(`📊 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=======================================================\n');

  return { passed, failed };
}

runBackendVerificationTests();

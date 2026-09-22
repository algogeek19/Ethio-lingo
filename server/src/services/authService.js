import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import * as userRepository from '../repositories/userRepository.js';
import * as walletRepository from '../repositories/walletRepository.js';

export const getPlacementQuizQuestions = async () => {
  const dbQuestions = await prisma.questionBank.findMany({
    where: { level: 'Placement' },
    take: 15,
  });

  return dbQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    answerIndex: q.answerIndex,
  }));
};

export const evaluatePlacementQuiz = async (userId, answers) => {
  const questions = await getPlacementQuizQuestions();
  let score = 0;

  if (Array.isArray(answers)) {
    answers.forEach((ans, idx) => {
      const question = questions[idx];
      if (question && (ans === question.answerIndex || ans?.selectedOption === question.answerIndex)) {
        score++;
      }
    });
  }

  // 15-question placement: Score > 10 -> Intermediate I, 7-10 -> Beginner II, < 7 -> Beginner I
  let evaluatedLevel = 'Beginner I';
  let message =
    'You have been assigned to Beginner I to build strong foundational English skills.';
  if (score > 10) {
    evaluatedLevel = 'Intermediate I';
    message = 'Congratulations! You scored high and have been placed in Intermediate I.';
  } else if (score >= 7) {
    evaluatedLevel = 'Beginner II';
    message = 'You have been placed in Beginner II to continue strengthening your English skills.';
  }

  if (userId) {
    await userRepository.updateUser(userId, { level: evaluatedLevel, isOnboarded: true });
  }

  return {
    score,
    totalQuestions: questions.length || 15,
    evaluatedLevel,
    message,
  };
};

export const loginUser = async (email, password) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError('Account not found. Please check your email or sign up.', 404);
  }

  // Password verify
  if (user.password) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Incorrect password. Please try again.', 401);
    }
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, level: user.level },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, user };
};

export const registerUser = async ({
  name,
  email,
  password,
  level = 'Beginner I',
  role = 'learner',
  isFreeTrial = true,
  phone,
  age,
  interests,
  listeningMinutesPerDay,
  listeningCategories,
}) => {
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new AppError('An account with this email address already exists.', 400);
  }

  const hashedPassword = await bcrypt.hash(password || 'learner', 10);
  const isLearner = role === 'learner';
  const isTrial = isFreeTrial !== false;

  const newUser = await userRepository.createUser({
    name,
    email,
    password: hashedPassword,
    level,
    role,
    isActive: isTrial, // Active for Free Trial, pending deposit for Staked Mode
    status: isTrial ? 'ACTIVE' : 'PENDING_APPROVAL',
    phone,
    age: age ? parseInt(age, 10) : null,
    interests,
    listeningMinutesPerDay: listeningMinutesPerDay ? parseInt(listeningMinutesPerDay, 10) : null,
    listeningCategories,
  });

  // Ensure wallet is created & attached for learner accounts
  if (isLearner && !newUser.wallet) {
    await walletRepository.createWalletForUser(newUser.id, 0.0, isTrial);
  }

  const fullUser = await userRepository.findUserById(newUser.id);
  const returnedUser = fullUser || newUser;

  const token = jwt.sign(
    { id: returnedUser.id, email: returnedUser.email, role: returnedUser.role, level: returnedUser.level },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, user: returnedUser };
};

export const updateUserProfile = async (userId, updateData) => {
  return await userRepository.updateUser(userId, updateData);
};

export const changeUserPassword = async (userId, currentPassword, newPassword) => {
  if (!userId) {
    throw new AppError('Authentication required to change password.', 401);
  }

  if (!newPassword || newPassword.trim().length < 6) {
    throw new AppError('New password must be at least 6 characters long.', 400);
  }

  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // If user already has a password set, verify current password
  if (user.password) {
    if (!currentPassword) {
      throw new AppError('Please provide your current password.', 400);
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }
  }

  const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
  await userRepository.updateUser(userId, { password: hashedPassword });

  return { message: 'Password updated successfully' };
};


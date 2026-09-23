import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ENV } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AppError } from '../utils/AppError.js';
import * as userRepository from '../repositories/userRepository.js';
import * as walletRepository from '../repositories/walletRepository.js';

// ---------------------------------------------------------------------------
// Email Verification & Google Identity
// ---------------------------------------------------------------------------

// Google OIDC JWKS (fetched lazily & cached by jose)
const GOOGLE_JWKS = createRemoteJWKSet(new URL(ENV.GOOGLE_JWKS_URL));

// Disposable / temporary email providers are never allowed on the platform.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamailblock.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.dev',
  'tempmailo.com',
  'throwawaymail.com',
  'sharklasers.com',
  'yopmail.com',
  'maildrop.cc',
  'getnada.com',
  '10minutemail.com',
  '10minutemail.net',
  'mohmal.com',
  'mailnesia.com',
  'dispostable.com',
  'mailcatch.com',
  'trashmail.com',
  'spamgourmet.com',
  '33mail.com',
  'jetable.org',
  'mailmetrash.com',
  'mintemail.com',
  'tmail.ws',
  'fakemail.net',
  'emailfake.com',
  'mailtemp.net',
  'tmpmail.org',
  'tempinbox.com',
  'discard.email',
]);

// Only Google-hosted (Gmail) domains + the platform's own admin domain are allowed.
const ALLOWED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'birrend.com',
]);

const generateVerificationCode = () =>
  String(Math.floor(100000 + Math.random() * 900000)); // 6-digit code

export const validateSignupEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    throw new AppError('A valid email address is required.', 400);
  }
  const domain = normalized.split('@')[1];
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    throw new AppError(
      'Temporary / disposable email addresses are not allowed. Please sign up with a real, Google-verified email (e.g. Gmail).',
      400
    );
  }
  if (!ALLOWED_EMAIL_DOMAINS.has(domain)) {
    throw new AppError(
      'Only Google-verified email addresses are accepted. Please sign up with a Gmail address (or a platform-approved domain).',
      400
    );
  }
  return normalized;
};

// Verify a Google OAuth ID token (audience, issuer, signature, email_verified).
export const verifyGoogleIdToken = async (idToken, expectedEmail) => {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new AppError('Google ID token is required.', 400);
  }
  if (!ENV.GOOGLE_CLIENT_ID) {
    throw new AppError(
      'Google sign-in is not configured on the server yet. Please set GOOGLE_CLIENT_ID.',
      500
    );
  }

  let payload;
  try {
    const result = await jwtVerify(idToken, GOOGLE_JWKS, {
      audience: ENV.GOOGLE_CLIENT_ID,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    });
    payload = result.payload;
  } catch (err) {
    throw new AppError('Google ID token verification failed. Please try again.', 401);
  }

  const email = String(payload.email || '').toLowerCase().trim();
  if (!email) {
    throw new AppError('Google account does not expose an email address.', 401);
  }
  if (payload.email_verified !== true) {
    throw new AppError('Google sign-in failed: this email is not verified by Google.', 401);
  }
  if (expectedEmail && email !== String(expectedEmail).toLowerCase().trim()) {
    throw new AppError(
      'Google verification email does not match the email on this account.',
      400
    );
  }

  return payload;
};

// Sign up OR sign in with a Google-verified ID token.
export const googleAuth = async (idToken) => {
  const payload = await verifyGoogleIdToken(idToken);
  const email = String(payload.email).toLowerCase().trim();
  const googleName = payload.name || payload.given_name || email.split('@')[0];
  const isNewUser = !(await userRepository.findUserByEmail(email));

  let user = await userRepository.findUserByEmail(email);

  if (!user) {
    user = await userRepository.createUser({
      name: googleName,
      email,
      password: null, // Google-authenticated accounts have no password
      role: 'learner',
      level: 'Beginner I',
      isOnboarded: false,
      isActive: true,
      status: 'ACTIVE',
      emailVerified: true, // Already verified by Google
      image: payload.picture || null,
    });
    if (!user.wallet) {
      await walletRepository.createWalletForUser(user.id, 0.0, true);
    }
    user = await userRepository.findUserById(user.id);
  } else {
    // Existing account: mark verified when Google confirms this exact email.
    if (!user.emailVerified) {
      user = await userRepository.updateUser(user.id, {
        emailVerified: true,
        status: user.status === 'PENDING_VERIFICATION' ? 'ACTIVE' : user.status,
        verificationCode: null,
        verificationCodeExpiresAt: null,
      });
    }
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, level: user.level },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, user, isNewUser };
};

// Verify the account email using the 6-digit code issued at signup (dev fallback channel).
export const verifyEmailCode = async (userId, code) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  if (user.emailVerified) {
    return { message: 'Email is already verified', user };
  }
  if (!user.verificationCode || !user.verificationCodeExpiresAt) {
    throw new AppError(
      'No active verification code found. Please request a new verification code.',
      400
    );
  }
  if (new Date(user.verificationCodeExpiresAt).getTime() < Date.now()) {
    throw new AppError('Verification code expired. Please request a new code.', 400);
  }
  if (String(user.verificationCode) !== String(code || '').trim()) {
    throw new AppError('Invalid verification code. Please check and try again.', 400);
  }

  const restoredStatus = user.wallet?.isFreeTrial ? 'ACTIVE' : 'PENDING_APPROVAL';
  const updatedUser = await userRepository.updateUser(userId, {
    emailVerified: true,
    verificationCode: null,
    verificationCodeExpiresAt: null,
    status: restoredStatus,
  });

  return { message: 'Email verified successfully', user: updatedUser };
};

// Re-issue a fresh 6-digit verification code for the current user.
export const resendVerificationCode = async (userId) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  if (user.emailVerified) {
    return { message: 'Email is already verified', user, debugCode: null };
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const updatedUser = await userRepository.updateUser(userId, {
    verificationCode: code,
    verificationCodeExpiresAt: expiresAt,
  });

  return {
    message: 'A new verification code has been issued.',
    user: updatedUser,
    // Dev-only convenience so the code can be surfaced without an SMTP provider.
    debugCode: ENV.NODE_ENV !== 'production' ? code : null,
  };
};

// Verify account email by presenting the same Google ID token used with that email.
export const verifyEmailViaGoogle = async (userId, idToken) => {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError('User not found.', 404);
  }
  if (user.emailVerified) {
    return { message: 'Email is already verified', user };
  }

  await verifyGoogleIdToken(idToken, user.email);

  const restoredStatus = user.wallet?.isFreeTrial ? 'ACTIVE' : 'PENDING_APPROVAL';
  const updatedUser = await userRepository.updateUser(userId, {
    emailVerified: true,
    verificationCode: null,
    verificationCodeExpiresAt: null,
    status: restoredStatus,
  });

  return { message: 'Email verified via Google successfully', user: updatedUser };
};

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
  const cleanEmail = validateSignupEmail(email);

  const existingUser = await userRepository.findUserByEmail(cleanEmail);
  if (existingUser) {
    throw new AppError('An account with this email address already exists.', 400);
  }

  const hashedPassword = await bcrypt.hash(password || 'learner', 10);
  const isLearner = role === 'learner';
  const isTrial = isFreeTrial !== false;

  // Every new account must verify its Google email BEFORE any daily learning is unlocked.
  const verificationCode = generateVerificationCode();
  const verificationCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const newUser = await userRepository.createUser({
    name,
    email: cleanEmail,
    password: hashedPassword,
    level,
    role,
    isActive: isTrial, // Trial accounts activate after verification; staked accounts then await deposit
    status: 'PENDING_VERIFICATION',
    emailVerified: false,
    verificationCode,
    verificationCodeExpiresAt,
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

  return {
    token,
    user: returnedUser,
    verification: {
      required: true,
      // Dev convenience: no SMTP is configured, so surface the code here.
      debugCode: ENV.NODE_ENV !== 'production' ? verificationCode : null,
    },
  };
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


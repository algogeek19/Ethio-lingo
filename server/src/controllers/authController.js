import * as authService from '../services/authService.js';
import * as userRepository from '../repositories/userRepository.js';
import { successResponse } from '../utils/apiResponse.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    return successResponse(res, 'Authentication successful', result);
  } catch (err) {
    next(err);
  }
};

export const signup = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      level,
      role,
      isFreeTrial,
      phone,
      age,
      interests,
      listeningMinutesPerDay,
      listeningCategories,
    } = req.body;
    const result = await authService.registerUser({
      name,
      email,
      password,
      level,
      role,
      isFreeTrial,
      phone,
      age,
      interests,
      listeningMinutesPerDay,
      listeningCategories,
    });
    return successResponse(res, 'Account created successfully', result, 201);
  } catch (err) {
    next(err);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const result = await authService.googleAuth(idToken);
    return successResponse(res, 'Google authentication successful', result);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    const userId = req.user ? req.user.id : null;
    const result = await authService.verifyEmailCode(userId, code);
    return successResponse(res, result.message || 'Email verified', result);
  } catch (err) {
    next(err);
  }
};

export const verifyEmailGoogle = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const userId = req.user ? req.user.id : null;
    const result = await authService.verifyEmailViaGoogle(userId, idToken);
    return successResponse(res, result.message || 'Email verified via Google', result);
  } catch (err) {
    next(err);
  }
};

export const resendVerificationCode = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : null;
    const result = await authService.resendVerificationCode(userId);
    return successResponse(res, result.message || 'Verification code re-issued', result);
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await userRepository.findUserByEmail(req.user.email);
    const resultUser = user
      ? {
          ...user,
          image: user.image || user.avatar,
          avatar: user.image || user.avatar,
        }
      : req.user;
    return successResponse(res, 'User profile fetched', resultUser);
  } catch (err) {
    next(err);
  }
};

export const getPlacementQuestions = async (req, res, next) => {
  try {
    const questions = await authService.getPlacementQuizQuestions();
    return successResponse(res, 'Placement quiz questions fetched', { questions });
  } catch (err) {
    next(err);
  }
};

export const submitPlacement = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const userId = req.user ? req.user.id : null;
    const result = await authService.evaluatePlacementQuiz(userId, answers);
    return successResponse(res, 'Placement quiz evaluated', result);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      avatar,
      image,
      level,
      currentDay,
      isOnboarded,
      isFreeTrial,
      phone,
      phoneVerified,
      age,
      interests,
      listeningMinutesPerDay,
      listeningCategories,
    } = req.body;
    const userId = req.user ? req.user.id : null;
    const avatarUrl = image || avatar;
    const updateData = {};
    if (name) updateData.name = name;
    if (level) updateData.level = level;
    if (currentDay !== undefined && currentDay !== null) {
      updateData.currentDay = parseInt(currentDay, 10);
    }
    if (isOnboarded !== undefined) {
      updateData.isOnboarded = !!isOnboarded;
    }
    if (avatarUrl) {
      updateData.image = avatarUrl;
    }
    if (phone !== undefined && phone !== null && phone !== '') {
      updateData.phone = String(phone).trim();
    }
    if (phoneVerified !== undefined) {
      updateData.phoneVerified = !!phoneVerified;
    }
    if (age !== undefined && age !== null && age !== '') {
      updateData.age = parseInt(age, 10);
    }
    if (interests !== undefined && interests !== null) {
      updateData.interests = Array.isArray(interests) ? JSON.stringify(interests) : interests;
    }
    if (listeningMinutesPerDay !== undefined && listeningMinutesPerDay !== null && listeningMinutesPerDay !== '') {
      updateData.listeningMinutesPerDay = parseInt(listeningMinutesPerDay, 10);
    }
    if (listeningCategories !== undefined && listeningCategories !== null) {
      updateData.listeningCategories = Array.isArray(listeningCategories)
        ? JSON.stringify(listeningCategories)
        : listeningCategories;
    }

    if (isFreeTrial !== undefined && userId) {
      await walletRepository.updateWallet(userId, {
        isFreeTrial: !!isFreeTrial,
        freeTrialDaysLeft: isFreeTrial ? 3 : 0,
      });
    }

    const updatedUser = await authService.updateUserProfile(userId, updateData);
    const responseUser = {
      ...updatedUser,
      image: updatedUser?.image || avatarUrl,
      avatar: updatedUser?.image || avatarUrl,
      currentDay: updatedUser?.currentDay || (currentDay ? parseInt(currentDay, 10) : 1),
    };
    return successResponse(res, 'Profile updated successfully', responseUser);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user ? req.user.id : null;
    const result = await authService.changeUserPassword(userId, currentPassword, newPassword);
    return successResponse(res, result.message || 'Password updated successfully', null);
  } catch (err) {
    next(err);
  }
};


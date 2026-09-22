import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { prisma } from '../config/database.js';
import { errorResponse } from '../utils/apiResponse.js';
import { auditUserStreakAndPenalties } from '../services/streakAuditService.js';

export const authenticateToken = async (req, res, next) => {
  try {
    let sessionUser = null;

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        // First try local JWT secret verification
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        sessionUser = decoded;
      } catch (jwtErr) {
        // Fallback: decode Supabase JWT token claims (signed by Supabase Auth)
        try {
          const decoded = jwt.decode(token);
          if (decoded && (decoded.email || decoded.sub)) {
            sessionUser = {
              id: decoded.sub || decoded.id,
              email: decoded.email || decoded.user_metadata?.email,
              name: decoded.user_metadata?.full_name || decoded.user_metadata?.name || decoded.email?.split('@')[0],
              role: decoded.user_metadata?.role || 'learner',
            };
          }
        } catch (e) {}
      }
    }

    // Dev / Test header fallbacks
    if (!sessionUser && req.headers['x-user-id']) {
      sessionUser = { id: req.headers['x-user-id'] };
    }

    if (!sessionUser && req.headers['x-user-email']) {
      sessionUser = { email: req.headers['x-user-email'] };
    }

    // Lookup user in Prisma database by id or email
    let dbUser = null;
    if (sessionUser && sessionUser.id) {
      dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { wallet: true },
      }).catch(() => null);
    }

    if (!dbUser && sessionUser && sessionUser.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: sessionUser.email },
        include: { wallet: true },
      }).catch(() => null);
    }


    // If user signed in via Supabase but doesn't have a Prisma DB record yet, auto-create
    if (!dbUser && sessionUser && sessionUser.email) {
      try {
        const isLearner = (sessionUser.role || 'learner') === 'learner';
        dbUser = await prisma.user.create({
          data: {
            email: sessionUser.email,
            name: sessionUser.name || sessionUser.email.split('@')[0],
            role: sessionUser.role || 'learner',
            level: sessionUser.level || 'Beginner I',
            isActive: true,
            status: 'ACTIVE',
            isOnboarded: false,
            wallet: isLearner
              ? {
                  create: {
                    stakedAmount: 0.0,
                    availableBalance: 0.0,
                    totalPenalties: 0.0,
                    totalPlatformFees: 0.0,
                    streakCount: 0,
                    isFreeTrial: true,
                    freeTrialDaysLeft: 3,
                  },
                }
              : undefined,
          },
          include: { wallet: true },
        });
      } catch (createErr) {
        // Fallback user object
      }
    }

    const user = dbUser || (sessionUser && sessionUser.email ? {
      id: sessionUser.id || `usr_${Math.floor(1000 + Math.random() * 9000)}`,
      email: sessionUser.email,
      name: sessionUser.name || sessionUser.email.split('@')[0],
      role: sessionUser.role || 'learner',
      level: sessionUser.level || 'Beginner I',
      isActive: true,
      status: 'ACTIVE',
    } : null);

    req.user = user;

    // Run On-Demand Catch-Up Audit asynchronously for learners
    if (user && user.id && user.role === 'learner') {
      auditUserStreakAndPenalties(user.id).catch(() => null);
    }

    next();
  } catch (err) {
    return errorResponse(res, 'Authentication failure.', 401);
  }
};

export const requireActiveAccount = async (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required.', 401);
  }

  if (req.user.role === 'learner' && (!req.user.isActive || req.user.status !== 'ACTIVE')) {
    return errorResponse(
      res,
      'Account Inactive or Pending Approval: Please submit or await admin deposit verification to unlock daily learning modules and exams.',
      403
    );
  }

  next();
};

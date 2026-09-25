import jwt from 'jsonwebtoken';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { ENV } from '../config/env.js';
import { prisma } from '../config/database.js';
import { errorResponse } from '../utils/apiResponse.js';
import { auditUserStreakAndPenalties } from '../services/streakAuditService.js';

let remoteJWKS = null;
const getJWKS = () => {
  if (!remoteJWKS && ENV.SUPABASE_JWKS_URL) {
    try {
      remoteJWKS = createRemoteJWKSet(new URL(ENV.SUPABASE_JWKS_URL));
    } catch (e) {
      console.warn('Failed to initialize Supabase JWKS:', e.message);
    }
  }
  return remoteJWKS;
};

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
        // Fallback: cryptographically verify Supabase Auth JWTs via JWKS.
        // Never use jwt.decode() here — it does not verify the signature, so a
        // hand-crafted token would otherwise be accepted as a valid session.
        const jwks = getJWKS();
        if (jwks) {
          try {
            const { payload } = await jwtVerify(token, jwks);
            if (payload && (payload.email || payload.sub)) {
              sessionUser = {
                id: payload.sub,
                email: payload.email,
                name: payload.user_metadata?.full_name || payload.user_metadata?.name || payload.email?.split('@')[0],
              };
            }
          } catch (sbErr) {
            // Signature verification failed — treated as unauthenticated below.
          }
        }
      }
    }

    // A valid, cryptographically verified token is mandatory.
    if (!sessionUser || (!sessionUser.id && !sessionUser.email)) {
      return errorResponse(res, 'Authentication required. Invalid or missing token.', 401);
    }

    // Lookup user in Prisma database by id or email
    let dbUser = null;
    if (sessionUser.id) {
      dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
        include: { wallet: true },
      }).catch(() => null);
    }

    if (!dbUser && sessionUser.email) {
      dbUser = await prisma.user.findUnique({
        where: { email: sessionUser.email },
        include: { wallet: true },
      }).catch(() => null);
    }

    // First-time Supabase/Google sign-in: provision strictly as a learner.
    // Role and level are never read from the token, so a forged or
    // user-editable claim can never grant admin access.
    if (!dbUser && sessionUser.email) {
      try {
        dbUser = await prisma.user.create({
          data: {
            email: sessionUser.email,
            name: sessionUser.name || sessionUser.email.split('@')[0],
            role: 'learner',
            level: 'Beginner I',
            isActive: true,
            status: 'ACTIVE',
            // The token itself was cryptographically verified above.
            emailVerified: true,
            isOnboarded: false,
            wallet: {
              create: {
                stakedAmount: 0.0,
                availableBalance: 0.0,
                totalPenalties: 0.0,
                totalPlatformFees: 0.0,
                streakCount: 0,
                isFreeTrial: true,
                freeTrialDaysLeft: 3,
              },
            },
          },
          include: { wallet: true },
        });
      } catch (createErr) {
        dbUser = await prisma.user.findUnique({
          where: { email: sessionUser.email },
          include: { wallet: true },
        }).catch(() => null);
      }
    }

    // Never synthesise a user from token claims. Identity and role must come
    // from the database, otherwise a forged claim could escalate privileges.
    if (!dbUser) {
      return errorResponse(res, 'User record not found in system.', 401);
    }

    req.user = dbUser;

    // Run On-Demand Catch-Up Audit asynchronously for learners
    if (dbUser.role === 'learner') {
      auditUserStreakAndPenalties(dbUser.id).catch(() => null);
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

  if (req.user.role === 'learner') {
    if (!req.user.emailVerified) {
      return errorResponse(
        res,
        'Email Not Verified: Please verify your Google email to unlock daily learning modules and exams.',
        403
      );
    }

    if (!req.user.isActive || req.user.status !== 'ACTIVE') {
      return errorResponse(
        res,
        'Account Inactive or Pending Approval: Please submit or await admin deposit verification to unlock daily learning modules and exams.',
        403
      );
    }
  }

  next();
};

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import PaymentPendingLockout from '../../features/auth/PaymentPendingLockout';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { authUser, isAuthenticated, role, logout, refreshUser } = useRole();
  const location = useLocation();
  const isVerifyPage = location.pathname === '/verify';

  if (!isAuthenticated || !authUser) {
    return <Navigate to="/auth" replace />;
  }

  // Email Verification Gate for Learners:
  // Unverified learners may ONLY see the /verify page — everything else bounces there.
  if (role === 'learner' && authUser.emailVerified === false) {
    return isVerifyPage ? children : <Navigate to="/verify" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If learner tries to access admin route, send to dashboard
    if (role === 'learner') {
      return <Navigate to="/dashboard" replace />;
    }
    // If admin tries to access learner route, send to admin overview
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
  }

  // Account Lockout Enforcement for Learners:
  // If learner isActive is false or status is not ACTIVE, render Lockout Screen
  if (role === 'learner' && (!authUser.isActive || (authUser.status && authUser.status !== 'ACTIVE'))) {
    return (
      <PaymentPendingLockout
        user={authUser}
        onStatusRefresh={refreshUser}
        onLogout={logout}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
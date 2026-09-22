import React from 'react';
import { Navigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import PaymentPendingLockout from '../../features/auth/PaymentPendingLockout';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { authUser, isAuthenticated, role, logout, refreshUser } = useRole();

  if (!isAuthenticated || !authUser) {
    return <Navigate to="/auth" replace />;
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

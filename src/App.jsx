import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { RoleProvider } from "./context/RoleContext";
import { StakingProvider } from "./context/StakingContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/common/Navbar";
import MobileNav from "./components/common/MobileNav";
import Footer from "./components/common/Footer";
import ProtectedRoute from "./components/common/ProtectedRoute";

import { LandingPage } from "./features/landing";
import { AuthPage, VerifyEmailPage } from "./features/auth";
import { LearnerDashboardPage as LearnerDashboard } from "./features/dashboard";
import { DailyExamRunnerPage as DailyExamRunner, ExamReviewPage } from "./features/exam";
import { LearningWorkspacesPage as LearningWorkspaces } from "./features/workspaces";
import { WalletPage } from "./features/wallet";
import { ChatPage } from "./features/chat";
import { FeedbackPage } from "./features/feedback";
import { AdminDashboardPage as AdminDashboard, AdminLearnersPage, CurriculumManagementPage as CurriculumManagement, AdminCommunityPage, AdminFeedbackPage } from "./features/admin";
import { ProfilePage } from "./features/profile";

import { useRole } from "./context/RoleContext";
const AppShell = () => {
  const location = useLocation();
  const { authUser } = useRole();
  const isLandingPage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-on-surface transition-colors duration-250">
      <Navbar />
      <main className="grow pt-24 md:pt-28 pb-16 lg:pb-0">
        <Routes>
          {/* Public Unauthenticated Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />

          {/* Email Verification (learner must verify before entering the portal) */}
          <Route
            path="/verify"
            element={
              <ProtectedRoute allowedRoles={["learner"]}>
                <VerifyEmailPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Learner Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["learner"]}>
                <LearnerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam"
            element={
              <ProtectedRoute allowedRoles={["learner"]}>
                <DailyExamRunner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/review"
            element={
              <ProtectedRoute allowedRoles={["learner"]}>
                <ExamReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspaces"
            element={
              <ProtectedRoute allowedRoles={["learner"]}>
                <LearningWorkspaces />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute allowedRoles={["learner"]}>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={["learner", "admin"]}>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute allowedRoles={["learner"]}>
                <FeedbackPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/learners"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLearnersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/curriculum"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <CurriculumManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/community"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminCommunityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/feedback"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminFeedbackPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Authenticated Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={["learner", "admin"]}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {isLandingPage && <Footer />}
      {!isLandingPage && <MobileNav />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <StakingProvider>
          <Router>
            <AppShell />
          </Router>
        </StakingProvider>
      </RoleProvider>
    </ThemeProvider>
  );
}

export default App;

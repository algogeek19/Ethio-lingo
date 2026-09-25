import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Award,
  LogOut,
  Edit2,
  Check,
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
  Users,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { useStaking, CURRICULUM_LEVELS } from '../../context/StakingContext';
import { formatETB } from '../../utils/formatters';
import { api } from '../../services/api';

// Curated DiceBear Avatar Collections
const generateDiceBearAvatars = (seedOffset = 0) => {
  const styles = ['lorelei', 'avataaars', 'bottts', 'micah', 'fun-emoji', 'personas'];
  const seeds = [
    'Abebe', 'Frehiwot', 'Tigist', 'Solomon', 'Kebede', 'Ethio-Lingo',
    'Alex', 'Maya', 'Jordan', 'Kobe', 'Sam', 'Taylor'
  ];
  return seeds.map((s, idx) => {
    const style = styles[idx % styles.length];
    const uniqueSeed = `${s}_${seedOffset}`;
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${uniqueSeed}`;
  });
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { authUser, logout, updateUserProfile } = useRole();
  const { wallet, streak, currentModuleDay } = useStaking();

  const activeUser = authUser || {};
  const isAdmin = activeUser?.role === 'admin';

  // Edit Profile Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(activeUser?.name || 'User');
  const [seedOffset, setSeedOffset] = useState(1);
  const [avatarList, setAvatarList] = useState(() => generateDiceBearAvatars(1));
  const [selectedAvatar, setSelectedAvatar] = useState(
    activeUser?.image || activeUser?.avatar || avatarList[0]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleShuffleAvatars = () => {
    const nextOffset = seedOffset + 1;
    setSeedOffset(nextOffset);
    const newList = generateDiceBearAvatars(nextOffset);
    setAvatarList(newList);
    setSelectedAvatar(newList[0]);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      updateUserProfile({ name: editName, image: selectedAvatar, avatar: selectedAvatar });
      await api.updateProfile(editName, selectedAvatar).catch(() => null);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1200);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!newPassword || newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPassSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccess(''), 5000);
    } catch (err) {
      setPassError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsChangingPass(false);
    }
  };


  const handleSignOut = async () => {
    try {
      await logout();
    } catch (err) {}
    navigate('/auth');
  };

  const currentLevel = activeUser?.level || 'Beginner I';
  const currentLevelIndex = CURRICULUM_LEVELS.indexOf(currentLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-4xl mx-auto py-10 px-4 lg:px-6 space-y-8 transition-colors duration-250"
    >
      {/* Scholar Profile Card */}
      <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl border border-hairline/60 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-hairline/50 pb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <img
                src={activeUser.image || activeUser.avatar || selectedAvatar}
                alt={activeUser.name || 'User'}
                className="w-20 h-20 rounded-full ring-1 ring-hairline object-cover shadow-sm bg-surface-soft"
              />
              <button
                onClick={() => setIsEditing(true)}
                aria-label="Change Avatar & Name"
                className="absolute bottom-0 right-0 p-2 bg-primary text-on-primary rounded-full shadow-md hover:bg-primary-container transition-transform hover:scale-105 cursor-pointer focus-ring"
                title="Change Avatar & Name"
              >
                <Edit2 size={14} />
              </button>
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <span className="font-mono text-[9px] tracking-widest text-primary uppercase font-semibold">
                Scholar Profile
              </span>

              <div className="flex items-center gap-2 justify-center sm:justify-start pt-0.5">
                <span className={`font-mono text-[9px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                  isAdmin ? 'bg-warning-amber/10 text-warning-amber' : 'bg-primary/10 text-primary'
                }`}>
                  <Award size={12} />
                  <span>{isAdmin ? 'Platform Admin' : `Level: ${currentLevel}`}</span>
                </span>
                <span className="font-mono text-[9px] tracking-widest text-primary uppercase font-semibold">
                  {isAdmin ? 'Administrator' : 'Learner Account'}
                </span>
              </div>

              <h1 className="font-cormorant text-3xl font-normal text-on-surface">
                {activeUser.name || 'User'}
              </h1>
              <p className="text-sm text-on-surface-variant">
                {activeUser.email}
                {activeUser.email ? ' · ' : ''}
                {isAdmin ? 'Platform Administrator' : `Level ${currentLevel} Scholar`}
              </p>

              <button
                onClick={() => setIsEditing(true)}
                className="mt-2 text-xs font-semibold text-primary hover:underline flex items-center gap-1 mx-auto sm:mx-0 cursor-pointer focus-ring rounded p-0.5"
              >
                <Edit2 size={12} />
                <span>Edit Name & Avatar</span>
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSignOut}
            className="px-5 py-2.5 bg-surface-container border border-hairline/60 text-destructive-red hover:bg-surface-container-high rounded-full text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer focus-ring"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </motion.button>
        </div>

        {/* Dynamic Display: Learner Stats vs Admin System Status */}
        {!isAdmin ? (
          <>
            {/* Learner Accountability & Progression Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 bg-surface-container-low rounded-lg space-y-2">
                <span className="mono-micro-label text-on-surface-variant font-semibold">Active Level</span>
                <div className="font-mono text-lg font-semibold text-primary tabular-nums">{currentLevel}</div>
              </div>

              <div className="p-5 bg-surface-container-low rounded-lg space-y-2">
                <span className="mono-micro-label text-on-surface-variant font-semibold">Locked Stake</span>
                <div className="font-mono text-lg font-semibold text-on-surface tabular-nums">{formatETB(wallet?.stakedAmount || 0)}</div>
              </div>

              <div className="p-5 bg-surface-container-low rounded-lg space-y-2">
                <span className="mono-micro-label text-on-surface-variant font-semibold">Continuous Streak</span>
                <div className="font-mono text-lg font-semibold text-streak-orange tabular-nums">{streak?.count || 0} Days</div>
              </div>
            </div>

            {/* 6 Curriculum Levels Roadmap for Learner */}
            <div className="p-5 sm:p-6 bg-surface-container-low border border-hairline/60 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-cormorant text-xl font-medium text-on-surface">6-Level Curriculum Progression Track</h3>
                <span className="font-mono text-xs text-primary">Current: Level {currentLevelIndex + 1} of 6</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {CURRICULUM_LEVELS.map((lvl, idx) => {
                  const isPast = idx < currentLevelIndex;
                  const isCurrent = idx === currentLevelIndex;
                  return (
                    <div
                      key={lvl}
                      className={`p-3 rounded-lg border text-center font-mono space-y-1 transition-all ${
                        isCurrent
                          ? 'border-primary bg-surface-soft ring-1 ring-primary'
                          : isPast
                            ? 'border-success-green/30 bg-success-green/10'
                            : 'border-hairline/60 bg-surface-lowest opacity-60'
                      }`}
                    >
                      <div className="mono-micro-label text-on-surface-variant font-bold">L{idx + 1}</div>
                      <div className={`text-xs font-bold ${isCurrent ? 'text-primary' : isPast ? 'text-success-green' : 'text-on-surface'}`}>
                        {lvl}
                      </div>
                      <div className="text-[9px] text-text-muted uppercase tracking-wider">
                        {isCurrent ? 'Active' : isPast ? 'Completed ✓' : 'Locked'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-hairline/50 flex items-center justify-between font-mono text-xs text-on-surface-variant">
                <span>Level Progress: Day {currentModuleDay} of 30</span>
                <span>{Math.round((currentModuleDay / 30) * 100)}% Complete</span>
              </div>
              <div className="w-full h-2 bg-surface-card rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(currentModuleDay / 30) * 100}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          /* Admin Specific System Overview (NO Learner/Student Data) */
          <div className="space-y-6">
            <div className="p-6 bg-surface-dark text-stone-300 border border-stone-800 rounded-2xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="text-warning-amber" size={20} />
                  <h3 className="font-cormorant text-xl font-medium text-stone-100">Platform System Administration</h3>
                </div>
                <span className="px-3 py-1 bg-success-green/10 text-success-green border border-success-green/40 text-xs font-mono font-semibold rounded-full uppercase tracking-wider">
                  System Clearance: Full
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono leading-relaxed">
                As a Ethio-Lingo Platform Administrator, your account maintains total system control over learner registrations, bank transfer escrow approvals, automated slashing penalties, and curriculum module publishing.
              </p>
            </div>

            {/* Admin Management Shortcuts Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div
                onClick={() => navigate('/admin/learners')}
                className="p-5 bg-surface-container-low border border-hairline/60 hover:border-primary rounded-xl space-y-2 cursor-pointer transition-all shadow-xs group btn-interactive focus-ring"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Users size={20} />
                </div>
                <h4 className="font-cormorant text-lg font-medium text-on-surface">Learner Directory</h4>
                <p className="text-xs text-on-surface-variant">Review learner deposits, escrow balances, and manual payment approvals.</p>
              </div>

              <div
                onClick={() => navigate('/admin')}
                className="p-5 bg-surface-container-low border border-hairline/60 hover:border-primary rounded-xl space-y-2 cursor-pointer transition-all shadow-xs group btn-interactive focus-ring"
              >
                <div className="w-10 h-10 rounded-xl bg-warning-amber/10 text-warning-amber flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-cormorant text-lg font-medium text-on-surface">Escrow & Slashing Audit</h4>
                <p className="text-xs text-on-surface-variant">Monitor daily platform fees, penalty deductions, and withdrawal requests.</p>
              </div>

              <div
                onClick={() => navigate('/admin/curriculum')}
                className="p-5 bg-surface-container-low border border-hairline/60 hover:border-primary rounded-xl space-y-2 cursor-pointer transition-all shadow-xs group btn-interactive focus-ring"
              >
                <div className="w-10 h-10 rounded-xl bg-success-green/10 text-success-green flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Layers size={20} />
                </div>
                <h4 className="font-cormorant text-lg font-medium text-on-surface">Curriculum Manager</h4>
                <p className="text-xs text-on-surface-variant">Edit 6-level daily lesson videos, listening URLs, and question banks.</p>
              </div>
            </div>
          </div>
        )}

        {/* Security & Password Management Card */}
        <div className="p-5 sm:p-6 bg-surface-container-low border border-hairline/60 rounded-2xl space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-hairline/50 pb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="font-cormorant text-xl font-medium text-on-surface">Security & Password Management</h3>
              <p className="text-xs text-on-surface-variant">Update your account credentials to keep your profile secure.</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl">
            {/* Feedback Alerts */}
            {passError && (
              <div className="p-3 bg-destructive-red/10 border border-destructive-red/30 text-destructive-red text-xs font-mono font-medium rounded-xl flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 bg-success-green/10 border border-success-green/30 text-success-green text-xs font-mono font-medium rounded-xl flex items-center gap-2">
                <Check size={16} className="shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="mono-micro-label text-on-surface-variant font-semibold">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-xs font-medium text-on-surface placeholder:text-on-surface-variant/40 focus-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
                  >
                    {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="mono-micro-label text-on-surface-variant font-semibold">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-xs font-medium text-on-surface placeholder:text-on-surface-variant/40 focus-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
                  >
                    {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="mono-micro-label text-on-surface-variant font-semibold">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    required
                    minLength={6}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-xs font-medium text-on-surface placeholder:text-on-surface-variant/40 focus-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
                  >
                    {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="mono-micro-label text-on-surface-variant">
                Password must be at least 6 characters.
              </span>
              <button
                type="submit"
                disabled={isChangingPass || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs tracking-wider uppercase font-semibold rounded-full shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer btn-interactive focus-ring"
              >
                <Lock size={14} />
                <span>{isChangingPass ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>


      {/* EDIT PROFILE & AVATAR PICKER MODAL */}
      <AnimatePresence>
        {isEditing && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest max-w-md w-full p-8 rounded-2xl shadow-2xl border border-hairline space-y-6 transition-colors duration-250"
            >
              <div className="flex items-center justify-between border-b border-hairline/50 pb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-primary" />
                  <h3 id="edit-profile-title" className="font-cormorant text-2xl font-normal text-on-surface">Edit Name & Avatar</h3>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  aria-label="Close edit profile dialog"
                  className="font-mono text-xs text-on-surface-variant hover:text-on-surface cursor-pointer focus-ring rounded p-1"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Full Name Field */}
                <div>
                  <label className="mono-micro-label text-on-surface-variant font-semibold mb-1.5 block">
                    Display Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3.5 py-2.5 rounded-xl border border-hairline/60 outline-none text-on-surface focus-ring"
                    required
                  />
                </div>

                {/* Avatar Gallery Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="mono-micro-label text-on-surface-variant font-semibold">
                      Select Avatar
                    </label>
                    <button
                      type="button"
                      onClick={handleShuffleAvatars}
                      className="px-4 py-1.5 bg-surface-container border border-hairline/60 hover:bg-surface-container-high text-primary text-xs font-mono font-semibold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer focus-ring"
                    >
                      <RefreshCw size={13} />
                      <span>Shuffle Avatars</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3 max-h-[220px] overflow-y-auto p-2 bg-surface-container-low border border-hairline/60 rounded-xl">
                    {avatarList.map((url, idx) => {
                      const isSelected = selectedAvatar === url;
                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedAvatar(url)}
                          className={`relative aspect-square rounded-lg p-1 border-2 cursor-pointer transition-all flex items-center justify-center bg-surface-lowest ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/30 scale-105 shadow-sm'
                              : 'border-hairline hover:border-primary/50'
                          }`}
                        >
                          <img src={url} alt={`Avatar option ${idx + 1}`} className="w-full h-full object-contain rounded-lg" />
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 bg-primary text-on-primary p-0.5 rounded-full shadow-xs">
                              <Check size={12} />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active Selected Avatar Preview */}
                <div className="p-3 bg-surface-container-low border border-hairline/60 rounded-xl flex items-center gap-3">
                  <img src={selectedAvatar} alt="Selected Avatar Preview" className="w-12 h-12 rounded-full border border-hairline bg-surface-lowest p-0.5" />
                  <div className="text-xs">
                    <span className="font-semibold text-primary block">Avatar Selected</span>
                    <span className="text-on-surface-variant">Previewing selection for your profile.</span>
                  </div>
                </div>

                {/* Save Confirmation Alert */}
                {saveSuccess && (
                  <div className="p-3 bg-success-green/15 border border-success-green/30 text-success-green text-xs font-semibold font-mono rounded-xl flex items-center gap-2">
                    <Check size={16} />
                    <span>Profile and avatar updated successfully!</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 bg-surface-container border border-hairline text-on-surface-variant hover:bg-surface-container-high text-xs font-semibold rounded-full transition-colors cursor-pointer focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary text-xs tracking-wider uppercase font-semibold rounded-full shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer btn-interactive focus-ring"
                  >
                    <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProfilePage;
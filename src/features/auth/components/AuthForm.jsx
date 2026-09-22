import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { formatETB } from '../../../utils/formatters';

export const AuthForm = ({ onAuthenticate }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('abebe.k@birrend.edu.et');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [stakeAmount, setStakeAmount] = useState(1500);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onAuthenticate) {
      onAuthenticate(stakeAmount);
    }
    navigate('/dashboard');
  };

  return (
    <div className="bg-canvas border border-hairline rounded-2xl p-6 sm:p-8 shadow-lg space-y-6 transition-colors duration-250">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-surface-card border border-hairline rounded-xl flex items-center justify-center p-1.5 mx-auto shadow-xs">
          <img src="/ethiolingo-logo.png" alt="Ethio-Lingo" className="w-full h-full object-contain" />
        </div>
        <h2 className="font-serif font-bold text-2xl text-on-surface">Sign In & Lock Stake</h2>
        <p className="text-xs text-on-surface-variant">Enter your credentials and select your 30-day stake tier.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 bg-surface-lowest border border-hairline rounded-xl text-sm text-on-surface focus-ring"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            Initial 30-Day Stake Commitment
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[500, 1500, 3000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setStakeAmount(amt)}
                className={`py-2.5 px-2 rounded-xl border text-xs font-mono font-medium transition-all focus-ring ${
                  stakeAmount === amt
                    ? 'border-primary-coral bg-primary-coral text-white shadow-xs'
                    : 'border-hairline bg-surface-lowest text-on-surface hover:border-primary-coral'
                }`}
              >
                {formatETB(amt)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-surface-dark text-white rounded-xl text-xs flex items-center gap-2 font-mono">
          <Lock size={16} className="text-warning-amber shrink-0" />
          <span>Escrow lock will be initialized.</span>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-primary-coral hover:bg-primary-hover active:bg-primary-active text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm btn-interactive focus-ring cursor-pointer"
        >
          <span>Lock Stake & Enter Portal</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
};

export default AuthForm;

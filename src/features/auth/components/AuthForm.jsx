import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { formatETB } from '../../../utils/formatters';

const inputClass = 'w-full bg-surface-container-low text-xs px-4 py-2.5 rounded-xl border border-hairline/60 outline-none focus:border-primary/50 text-on-surface placeholder:text-text-muted focus-ring';
const labelClass = 'block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-1';

export const AuthForm = ({ onAuthenticate }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="bg-surface-container-lowest rounded-2xl border border-hairline/60 shadow-sm p-8 space-y-6 transition-colors duration-250">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 bg-surface-card border border-hairline/60 rounded-2xl flex items-center justify-center p-1.5 mx-auto shadow-sm">
          <img src="/ethiolingo-logo.png" alt="Ethio-Lingo" className="w-full h-full object-contain" />
        </div>
        <span className="mono-micro-label font-bold text-primary block">Scholar Access</span>
        <h2 className="font-cormorant text-3xl font-normal text-on-surface">Sign In & Lock Stake</h2>
        <p className="text-xs text-on-surface-variant">Enter your credentials and select your 30-day stake tier.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="User@example.com"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full bg-surface-container-low text-xs pl-4 pr-11 py-2.5 rounded-xl border border-hairline/60 outline-none focus:border-primary/50 text-on-surface placeholder:text-text-muted focus-ring"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">
            Initial 30-Day Stake Commitment
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[500, 1500, 3000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setStakeAmount(amt)}
                className={`py-2.5 px-2 rounded-full border text-xs font-mono font-medium transition-all focus-ring cursor-pointer ${
                  stakeAmount === amt
                    ? 'border-primary bg-primary text-on-primary shadow-xs'
                    : 'border-hairline bg-surface-lowest text-on-surface hover:border-primary'
                }`}
              >
                {formatETB(amt)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-surface-dark text-stone-300 border border-stone-800 rounded-xl text-xs flex items-center gap-2 font-mono">
          <Lock size={16} className="text-warning-amber shrink-0" />
          <span>Escrow lock will be initialized.</span>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-full bg-primary text-on-primary text-xs tracking-wider uppercase font-semibold hover:bg-primary-container shadow-sm transition-all flex items-center justify-center gap-2 btn-interactive focus-ring cursor-pointer"
        >
          <span>Lock Stake & Enter Portal</span>
          <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
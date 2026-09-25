import React from 'react';
import { formatETB } from '../../../utils/formatters';
import { useAdmin } from '../hooks/useAdmin';

export const LearnersDirectoryTable = () => {
  const { learners, approvePayout } = useAdmin();

  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline/60 bg-surface-lowest shadow-sm transition-colors duration-250">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
            <th className="py-3.5 px-4 font-normal">Learner ID & Name</th>
            <th className="py-3.5 px-4 font-normal">Email</th>
            <th className="py-3.5 px-4 font-normal">Locked Stake</th>
            <th className="py-3.5 px-4 font-normal">Streak</th>
            <th className="py-3.5 px-4 font-normal">Status</th>
            <th className="py-3.5 px-4 text-right font-normal">Escrow Action</th>
          </tr>
        </thead>
        <tbody className="text-xs font-mono">
          {learners.map((l) => (
            <tr key={l.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
              <td className="py-3.5 px-4">
                <span className="text-text-muted font-mono block text-[10px]">{l.id}</span>
                <span className="font-sans font-semibold text-on-surface">{l.name}</span>
              </td>
              <td className="py-3.5 px-4 text-on-surface-variant font-sans">{l.email}</td>
              <td className="py-3.5 px-4 font-semibold text-on-surface tabular-nums">{formatETB(l.stake)}</td>
              <td className="py-3.5 px-4 text-streak-orange tabular-nums">{l.streak} Days 🔥</td>
              <td className="py-3.5 px-4">
                {l.status === 'PENDING_PAYOUT' ? (
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-warning-amber/10 text-warning-amber rounded uppercase tracking-wider">
                    PAYOUT READY
                  </span>
                ) : l.status === 'COMPLETED_RELEASED' ? (
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-success-green/10 text-success-green rounded uppercase tracking-wider">
                    FUNDS RELEASED
                  </span>
                ) : (
                  <span className="font-mono text-[9px] px-2 py-0.5 bg-surface-container text-on-surface-variant rounded uppercase tracking-wider">
                    ACTIVE VAULT
                  </span>
                )}
              </td>
              <td className="py-3.5 px-4 text-right">
                {l.status === 'PENDING_PAYOUT' ? (
                  <button
                    onClick={() => approvePayout(l.id)}
                    className="rounded-full bg-success-green hover:opacity-90 text-white font-sans font-semibold text-[10px] uppercase tracking-wider px-3.5 py-1.5 shadow-sm transition-all focus-ring btn-interactive cursor-pointer"
                  >
                    Approve & Release ETB
                  </button>
                ) : (
                  <button className="rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-sans font-semibold text-[10px] uppercase tracking-wider px-3.5 py-1.5 transition-all focus-ring cursor-pointer">
                    View Audit Log
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LearnersDirectoryTable;
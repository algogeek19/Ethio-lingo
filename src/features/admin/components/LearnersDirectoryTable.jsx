import React from 'react';
import { formatETB } from '../../../utils/formatters';
import { useAdmin } from '../hooks/useAdmin';

export const LearnersDirectoryTable = () => {
  const { learners, approvePayout } = useAdmin();

  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas transition-colors duration-250">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-card border-b border-hairline text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            <th className="py-3.5 px-4">Learner ID & Name</th>
            <th className="py-3.5 px-4">Email</th>
            <th className="py-3.5 px-4">Locked Stake</th>
            <th className="py-3.5 px-4">Streak</th>
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4 text-right">Escrow Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline text-xs font-mono">
          {learners.map((l) => (
            <tr key={l.id} className="hover:bg-surface-soft transition-colors">
              <td className="py-3.5 px-4">
                <span className="text-text-muted font-mono block text-[10px]">{l.id}</span>
                <span className="font-sans font-bold text-on-surface">{l.name}</span>
              </td>
              <td className="py-3.5 px-4 text-on-surface-variant font-sans">{l.email}</td>
              <td className="py-3.5 px-4 font-bold text-on-surface">{formatETB(l.stake)}</td>
              <td className="py-3.5 px-4 text-streak-orange">{l.streak} Days 🔥</td>
              <td className="py-3.5 px-4">
                {l.status === 'PENDING_PAYOUT' ? (
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-warning-amber rounded-lg text-[10px] font-bold">
                    PAYOUT READY
                  </span>
                ) : l.status === 'COMPLETED_RELEASED' ? (
                  <span className="px-2.5 py-0.5 bg-green-500/20 text-success-green rounded-lg text-[10px] font-bold">
                    FUNDS RELEASED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-surface-card text-on-surface-variant rounded-lg text-[10px]">
                    ACTIVE VAULT
                  </span>
                )}
              </td>
              <td className="py-3.5 px-4 text-right">
                {l.status === 'PENDING_PAYOUT' ? (
                  <button
                    onClick={() => approvePayout(l.id)}
                    className="px-3.5 py-1.5 bg-success-green hover:bg-green-600 text-white font-sans font-semibold rounded-xl text-[11px] shadow-xs focus-ring btn-interactive cursor-pointer"
                  >
                    Approve & Release ETB
                  </button>
                ) : (
                  <button className="px-3.5 py-1.5 bg-surface-card hover:bg-surface-high text-on-surface font-sans font-semibold rounded-xl text-[11px] focus-ring cursor-pointer">
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

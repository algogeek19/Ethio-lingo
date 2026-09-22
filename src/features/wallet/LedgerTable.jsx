import React from 'react';
import { formatETB, formatDate } from '../../utils/formatters';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

const LedgerTable = ({ transactions = [] }) => {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#e6dfd8] bg-[#faf9f5]">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#efeeea] border-b border-[#e6dfd8] text-[11px] font-semibold text-[#54433e] uppercase tracking-wider">
            <th className="py-3 px-4">Transaction ID</th>
            <th className="py-3 px-4">Timestamp</th>
            <th className="py-3 px-4">Description</th>
            <th className="py-3 px-4 text-right">Amount (ETB)</th>
            <th className="py-3 px-4 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e6dfd8] text-xs font-mono">
          {transactions.map((tx) => {
            const isPenalty = tx.amount < 0 || tx.type === 'PENALTY_DEDUCTION';
            const isDeposit = tx.amount > 0;
            
            return (
              <tr key={tx.id} className="hover:bg-[#f5f0e8] transition-colors">
                <td className="py-3.5 px-4 font-semibold text-[#141413]">
                  {tx.id}
                </td>
                <td className="py-3.5 px-4 text-[#6c6a64]">
                  {formatDate(tx.createdAt)}
                </td>
                <td className="py-3.5 px-4 font-sans text-[#3d3d3a]">
                  {tx.description}
                </td>
                <td
                  className={`py-3.5 px-4 text-right font-bold ${
                    isPenalty
                      ? 'text-[#c64545]'
                      : isDeposit
                      ? 'text-[#5db872]'
                      : 'text-[#1b1c1a]'
                  }`}
                >
                  {tx.amount === 0
                    ? 'ETB 0.00'
                    : `${isDeposit ? '+' : ''}${formatETB(tx.amount)}`}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {isPenalty ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-[#c64545]/15 text-[#c64545]">
                      <ShieldAlert size={12} />
                      PENALTY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium bg-[#5db872]/15 text-[#5db872]">
                      <ShieldCheck size={12} />
                      PROTECTED
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {transactions.length === 0 && (
        <div className="py-12 px-4 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-surface-soft border border-hairline flex items-center justify-center mx-auto text-on-surface-variant">
            <ShieldCheck size={20} className="text-primary-coral" />
          </div>
          <p className="text-xs font-bold text-on-surface font-sans">No Escrow Transactions Yet</p>
          <p className="text-[11px] text-on-surface-variant font-mono max-w-sm mx-auto">
            Your staked escrow activity and exam penalty deductions will be recorded here in full transparency.
          </p>
        </div>
      )}
    </div>
  );
};

export default LedgerTable;

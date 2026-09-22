import React from 'react';
import { formatETB, formatDate } from '../../../utils/formatters';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export const LedgerTable = ({ transactions = [] }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-canvas transition-colors duration-250">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-card border-b border-hairline text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            <th className="py-3.5 px-4">Transaction ID</th>
            <th className="py-3.5 px-4">Timestamp</th>
            <th className="py-3.5 px-4">Description</th>
            <th className="py-3.5 px-4 text-right">Amount (ETB)</th>
            <th className="py-3.5 px-4 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline text-xs font-mono">
          {transactions.map((tx) => {
            const isPenalty = tx.amount < 0 || tx.type === 'PENALTY_DEDUCTION';
            const isDeposit = tx.amount > 0;

            return (
              <tr key={tx.id} className="hover:bg-surface-soft transition-colors">
                <td className="py-3.5 px-4 font-semibold text-on-surface">
                  {tx.id}
                </td>
                <td className="py-3.5 px-4 text-text-muted">
                  {formatDate(tx.createdAt)}
                </td>
                <td className="py-3.5 px-4 font-sans text-on-surface-variant">
                  {tx.description}
                </td>
                <td
                  className={`py-3.5 px-4 text-right font-bold ${
                    isPenalty
                      ? 'text-destructive-red'
                      : isDeposit
                      ? 'text-success-green'
                      : 'text-on-surface'
                  }`}
                >
                  {tx.amount === 0
                    ? 'ETB 0.00'
                    : `${isDeposit ? '+' : ''}${formatETB(tx.amount)}`}
                </td>
                <td className="py-3.5 px-4 text-center">
                  {isPenalty ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium bg-red-500/15 text-destructive-red">
                      <ShieldAlert size={12} />
                      PENALTY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium bg-green-500/15 text-success-green">
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
    </div>
  );
};

export default LedgerTable;

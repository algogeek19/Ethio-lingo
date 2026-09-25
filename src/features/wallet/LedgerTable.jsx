import React from 'react';
import { formatETB, formatDate } from '../../utils/formatters';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

const LedgerTable = ({ transactions = [] }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline/50 bg-surface-container-lowest transition-colors duration-250">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="font-mono text-[10px] uppercase tracking-widest text-text-muted border-b border-hairline">
            <th className="py-3.5 px-4 font-medium">Transaction ID</th>
            <th className="py-3.5 px-4 font-medium">Timestamp</th>
            <th className="py-3.5 px-4 font-medium">Description</th>
            <th className="py-3.5 px-4 font-medium text-right">Amount (ETB)</th>
            <th className="py-3.5 px-4 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody className="text-xs font-mono">
          {transactions.map((tx) => {
            const isPenalty = tx.amount < 0 || tx.type === 'PENALTY_DEDUCTION';
            const isDeposit = tx.amount > 0;

            return (
              <tr key={tx.id} className="border-t border-hairline/50 hover:bg-surface-soft transition-colors">
                <td className="py-3.5 px-4 font-semibold text-on-surface">
                  {tx.id}
                </td>
                <td className="py-3.5 px-4 text-text-muted tabular-nums">
                  {formatDate(tx.createdAt)}
                </td>
                <td className="py-3.5 px-4 font-sans text-on-surface-variant">
                  {tx.description}
                </td>
                <td
                  className={`py-3.5 px-4 text-right font-semibold tabular-nums ${
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
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-error/10 text-error">
                      <ShieldAlert size={12} />
                      PENALTY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider bg-primary/10 text-primary">
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
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <p className="font-cormorant text-xl text-on-surface">No Escrow Transactions Yet</p>
          <p className="text-[11px] text-on-surface-variant font-mono max-w-sm mx-auto">
            Your staked escrow activity and exam penalty deductions will be recorded here in full transparency.
          </p>
        </div>
      )}
    </div>
  );
};

export default LedgerTable;
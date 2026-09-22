import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';

export const PdfViewer = () => {
  const [currentPage, setCurrentPage] = useState(14);
  const totalPages = 42;
  const [isBookmarked, setIsBookmarked] = useState(true);

  return (
    <div className="bg-canvas border border-hairline rounded-2xl overflow-hidden shadow-xs transition-colors duration-250">
      <div className="bg-surface-card border-b border-hairline p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-surface-dark text-white font-mono text-xs font-bold rounded-lg border border-stone-800">
            PDF DOCUMENT
          </span>
          <h3 className="font-serif font-bold text-base text-on-surface">
            Ethiopian Commercial Code (2026 Revised Edition)
          </h3>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-on-surface-variant">
          <div className="flex items-center gap-1 bg-surface-lowest border border-hairline rounded-xl px-2 py-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              aria-label="Previous Page"
              className="p-1 hover:text-on-surface focus-ring rounded"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              aria-label="Next Page"
              className="p-1 hover:text-on-surface focus-ring rounded"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            aria-label={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
            className={`p-2 rounded-xl border transition-colors focus-ring cursor-pointer ${
              isBookmarked
                ? 'bg-primary-coral text-white border-primary-coral'
                : 'bg-surface-lowest text-on-surface-variant border-hairline'
            }`}
          >
            <Bookmark size={16} />
          </button>
        </div>
      </div>

      <div className="p-8 sm:p-12 bg-surface-lowest min-h-[500px] border-b border-hairline max-w-4xl mx-auto my-6 shadow-sm rounded-2xl">
        <div className="font-serif space-y-6 text-on-surface">
          <div className="border-b border-hairline pb-4 flex items-center justify-between">
            <span className="text-xs font-mono text-primary-coral font-bold">
              TITLE III • SECTION V
            </span>
            <span className="text-xs font-mono text-text-muted">PAGE {currentPage}</span>
          </div>

          <h1 className="font-bold text-2xl text-on-surface">
            Article 418: Escrow Vault & Financial Commitment Agreements
          </h1>

          <p className="text-sm leading-relaxed text-on-surface-variant">
            1. An escrow agreement concluded under this Section binds the depositor to commit a specified financial sum (the "Stake") to a licensed custodian or algorithmic smart-vault for a mandatory period of not less than thirty (30) consecutive calendar days.
          </p>

          <p className="text-sm leading-relaxed text-on-surface-variant">
            2. Forfeiture of stakes shall occur strictly upon non-fulfillment of verified daily assessment metrics. Deductions shall be processed algorithmically into the central penalty pool without intermediary discretion.
          </p>

          <div className="p-4 bg-surface-soft border-l-4 border-primary-coral rounded-r-xl text-xs space-y-1">
            <span className="font-bold text-primary-coral">Statutory Note:</span>
            <p className="text-on-surface-variant">
              Ethio-Lingo escrow accounts operate under Section 418 sub-clause 2, ensuring AAA legal compliance and transparent financial ledger auditing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;

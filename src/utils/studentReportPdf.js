import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────────────────────
// Student Information Report — PDF generator (admin panel)
// Builds a complete, print-ready PDF dossier for a learner:
// identity & contact details, demographics, wallet / staking summary,
// daily progress, exam history, full financial ledger, withdrawal requests.
// ─────────────────────────────────────────────────────────────────────────────

// Editorial design tokens (mirrors the Ethio-Lingo UI palette)
const PRIMARY = [143, 57, 30]; // #8f391e
const DARK = [32, 26, 24];     // #201a18 (on-surface)
const LIGHT_BG = [246, 243, 238]; // #f6f3ee (soft parchment strip)
const GREEN = [79, 143, 93];    // success
const RED = [186, 26, 26];      // error
const AMBER = [185, 138, 30];   // warning
const MUTED = [133, 114, 107];  // on-surface-variant
const HAIRLINE = [224, 218, 210];
const WHITE = [255, 255, 255];

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const M = 28;          // content margin
const BOTTOM = 48;     // bottom safe zone (above the footer)
const TOP_MARGIN = 40; // first baseline on a fresh page

// ── Small helpers ────────────────────────────────────────────────────────────

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const fmtETB = (amount = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const fmtDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const fmtDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const orDash = (v) =>
  v === undefined || v === null || v === '' ? '—' : String(v);

// If `y` is too close to the bottom of the current page, start a new page.
// `reserve` accounts for the section header + several table rows that follow.
const ensureRoom = (doc, y, reserve = 84) => {
  if (y > PAGE_H - BOTTOM - reserve) {
    doc.addPage();
    return TOP_MARGIN;
  }
  return y;
};

// Section header: coral index + title, hairline rule, optional subtitle line.
const sectionHeader = (doc, y, num, title, subtitle = '') => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY);
  doc.text(String(num).padStart(2, '0'), M, y - 4);

  doc.setFontSize(12.5);
  doc.setTextColor(...DARK);
  doc.text(title.toUpperCase(), M + 26, y - 4);

  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.9);
  doc.line(M, y + 2, PAGE_W - M, y + 2);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, M, y + 13);
    return y + 21;
  }
  return y + 10;
};

// Three-column key/value grid that measures wrapped values so rows never
// overlap. Advances the cursor by the tallest cell in each row.
const kvGrid = (doc, startY, rows) => {
  const gridW = PAGE_W - M * 2;
  const gap = 18;
  const colW = (gridW - gap * 2) / 3;
  let cursor = startY;

  rows.forEach((row, ri) => {
    const lines = row.values.map((v) => {
      const txt = orDash(v);
      return doc.splitTextToSize(txt, colW - 4).length;
    });
    const maxLines = Math.max(...lines, 1);
    const rowH = 11 + maxLines * 11 + 6;

    // Keep the whole row on one page.
    if (cursor + rowH > PAGE_H - BOTTOM - 6) {
      doc.addPage();
      cursor = TOP_MARGIN;
    }

    for (let ci = 0; ci < 3; ci++) {
      const x = M + ci * (colW + gap);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text(String(rows[0].keys[ci] || '').toUpperCase(), x, cursor);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK);
      doc.text(doc.splitTextToSize(orDash(row.values[ci]), colW - 4), x, cursor + 10);
    }

    if (ri < rows.length - 1) {
      doc.setDrawColor(...HAIRLINE);
      doc.setLineWidth(0.4);
      doc.line(M, cursor + rowH - 5, PAGE_W - M, cursor + rowH - 5);
    }
    cursor += rowH;
  });

  return cursor;
};

// Muted “no records” note box (used instead of a broken one-row table).
const emptyNote = (doc, y, text) => {
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(M, y - 11, PAGE_W - M * 2, 28, 5, 5, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(text, PAGE_W / 2, y + 3, { align: 'center' });
  return y + 30;
};

const statusColor = (status) => {
  const s = String(status || '').toLowerCase();
  if (['success', 'completed', 'approved', 'passed'].includes(s)) return GREEN;
  if (['failed', 'declined', 'penalty', 'rejected'].includes(s)) return RED;
  if (s === 'pending') return AMBER;
  if (['active', 'locked', 'withdrawn', 'refunded', 'cancelled'].includes(s)) return MUTED;
  return MUTED;
};

// Shared autoTable config so every table keeps the same editorial look.
const tableOpts = (doc, { head, body, startY, columnStyles = {}, didParseCell }) => ({
  startY,
  head,
  body,
  theme: 'grid',
  styles: {
    fontSize: 8,
    cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
    textColor: DARK,
    lineColor: HAIRLINE,
    lineWidth: 0.3,
  },
  headStyles: { fillColor: PRIMARY, textColor: WHITE, fontSize: 8, fontStyle: 'bold' },
  alternateRowStyles: { fillColor: LIGHT_BG },
  margin: { left: M, right: M, top: 34, bottom: BOTTOM + 8 },
  columnStyles,
  didParseCell,
});

// ── Main generator ───────────────────────────────────────────────────────────

/**
 * Generate and trigger a download of the full student PDF report.
 * @param {object} student - Full learner record from api.getLearnerDetails()
 * @returns {void}
 */
export const downloadStudentReportPdf = (student) => {
  if (!student) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({
    title: `Ethio-Lingo Student Report — ${student.name || 'Learner'}`,
    subject: 'Student Information Report (admin)',
    author: 'Ethio-Lingo Admin',
    creator: 'Ethio-Lingo',
  });

  const wallet = student.wallet || {};
  const progress = Array.isArray(student.dailyProgress) ? student.dailyProgress : [];
  const attempts = Array.isArray(student.examAttempts) ? student.examAttempts : [];
  const ledger = Array.isArray(student.ledgerTransactions) ? student.ledgerTransactions : [];
  const withdrawals = Array.isArray(student.withdrawals) ? student.withdrawals : [];

  const interests = parseJsonArray(student.interests);
  const listeningCategories = parseJsonArray(student.listeningCategories);

  const accountState = student.isBanned
    ? 'BANNED'
    : student.isActive === false
      ? 'Disabled'
      : 'Active';
  const statusLabel = student.status || (student.isActive === false ? 'Suspended' : 'Active');

  // Footer: document meta + page numbers on every page.
  const footer = () => {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(
        `Ethio-Lingo • Student Information Report • Generated ${fmtDateTime(new Date().toISOString())}`,
        M,
        PAGE_H - 20
      );
      doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 20, { align: 'right' });
    }
  };

  // ── Page 1 masthead ─────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 104, 'F');
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 104, PAGE_W, 3, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(25);
  doc.setTextColor(...WHITE);
  doc.text('ETHIO-LINGO', M, 46);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...AMBER);
  doc.text('STUDENT INFORMATION REPORT', M, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(205, 198, 190);
  doc.text(`Learner ID: ${student.id || '—'}   •   Generated: ${fmtDateTime(new Date().toISOString())}`, M, 86);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...AMBER);
  doc.text(`STATUS: ${statusLabel.toUpperCase()}`, PAGE_W - M, 86, { align: 'right' });

  // ── 1 · Identity & Contact Details ──────────────────────────────────────────
  let y = sectionHeader(doc, 132, 1, 'Identity & Contact Details', 'Personal profile, contact methods, and platform status');
  y = kvGrid(doc, y, [
    {
      keys: ['Full Name', 'Email Address', 'Phone Number'],
      values: [student.name, student.email, student.phone],
    },
    {
      keys: ['Account Status', 'Curriculum Level', 'Current Day'],
      values: [student.status || accountState, student.level || 'Beginner I', `Day ${student.currentDay || 1}`],
    },
    {
      keys: ['Member Since', 'Account State', 'Messaging Status'],
      values: [fmtDate(student.createdAt), accountState, student.isBanned ? 'Banned' : 'Allowed'],
    },
  ]);

  // ── 2 · Demographics & Learning Preferences ─────────────────────────────────
  y = y + 14;
  y = ensureRoom(doc, y, 120);
  y = sectionHeader(doc, y, 2, 'Demographics & Learning Preferences', 'Age, interests, and daily listening habits');
  y = kvGrid(doc, y, [
    {
      keys: ['Age', 'Interests', 'Daily Listening Track'],
      values: [
        student.age ?? '—',
        interests.length ? interests.join(', ') : '—',
        student.listeningMinutesPerDay ? `${student.listeningMinutesPerDay} min / day` : '—',
      ],
    },
    {
      keys: ['Listening Categories', 'Timezone', 'Free Trial'],
      values: [
        listeningCategories.length ? listeningCategories.join(', ') : '—',
        student.timezone || 'Africa/Addis_Ababa',
        wallet.isFreeTrial ? `Active (${wallet.freeTrialDaysLeft ?? 0} days left)` : 'Staked Mode',
      ],
    },
  ]);

  // ── 3 · Wallet & Staking Summary ────────────────────────────────────────────
  y = y + 14;
  y = ensureRoom(doc, y, 110);
  y = sectionHeader(doc, y, 3, 'Wallet & Staking Summary', 'Vault balance, streak, penalties, and fees');
  y = kvGrid(doc, y, [
    {
      keys: ['Staked Escrow Vault', 'Available Balance', 'Continuous Streak'],
      values: [fmtETB(wallet.stakedAmount), fmtETB(wallet.availableBalance), `${wallet.streakCount || 0} day(s)`],
    },
    {
      keys: ['Total Penalties Slashed', 'Total Platform Fees', 'Last Completed Day'],
      values: [fmtETB(wallet.totalPenalties), fmtETB(wallet.totalPlatformFees), wallet.lastCompletedDate || '—'],
    },
  ]);

  // ── 4 · Daily Task & Exam Progress ──────────────────────────────────────────
  y = y + 14;
  y = ensureRoom(doc, y, 92);
  y = sectionHeader(doc, y, 4, 'Daily Task & Exam Progress', 'Per-day completion of lesson, listening practice, and exam');
  if (!progress.length) {
    y = emptyNote(doc, y + 12, 'No daily progress recorded yet.');
  } else {
    autoTable(
      doc,
      tableOpts(doc, {
        startY: y,
        head: [['Day', 'Date', 'Level', 'Task 1 Lesson', 'Task 2 Listening', 'Exam Score', 'Result']],
        body: progress.map((p) => [
          `Day ${p.dayNumber}`,
          p.progressDate || '—',
          p.level || '—',
          p.task1LessonCompleted ? 'Completed' : 'Pending',
          p.task2ListeningCompleted ? 'Completed' : 'Pending',
          p.examCompleted ? `${p.examScore}/20` : 'Not Attempted',
          p.examCompleted ? (p.examPassed ? 'PASSED' : 'FAILED') : '—',
        ]),
        columnStyles: { 0: { cellWidth: 44 }, 5: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          if (data.column.index === 6) {
            const v = String(data.cell.raw || '');
            data.cell.styles.textColor = v === 'PASSED' ? GREEN : v === 'FAILED' ? RED : MUTED;
          }
          if (data.column.index === 5) {
            const v = String(data.cell.raw || '');
            data.cell.styles.textColor = v.includes('Not') ? MUTED : DARK;
          }
        },
      })
    );
  }

  // ── 5 · Exam History ────────────────────────────────────────────────────────
  y = (progress.length ? doc.lastAutoTable.finalY : y) + 16;
  y = ensureRoom(doc, y, 92);
  y = sectionHeader(doc, y, 5, 'Exam History', 'Every recorded daily exam attempt');
  if (!attempts.length) {
    y = emptyNote(doc, y + 12, 'No exam attempts recorded yet.');
  } else {
    autoTable(
      doc,
      tableOpts(doc, {
        startY: y,
        head: [['Day', 'Level', 'Score', 'Pass Mark', 'Result', 'Date']],
        body: attempts.map((a) => [
          `Day ${a.dayNumber}`,
          a.level || '—',
          `${a.score}/${a.totalQuestions || 20}`,
          `${a.passThreshold || 15}/${a.totalQuestions || 20}`,
          a.passed ? 'PASSED' : 'FAILED',
          fmtDate(a.createdAt),
        ]),
        columnStyles: { 0: { cellWidth: 44 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            data.cell.styles.textColor = String(data.cell.raw) === 'PASSED' ? GREEN : RED;
          }
        },
      })
    );
  }

  // ── 6 · Financial Ledger (Money History) ────────────────────────────────────
  y = (attempts.length ? doc.lastAutoTable.finalY : y) + 16;
  y = ensureRoom(doc, y, 92);
  y = sectionHeader(doc, y, 6, 'Financial Ledger — Money History', 'Deposits, penalties, settlements, and withdrawals');
  if (!ledger.length) {
    y = emptyNote(doc, y + 12, 'No ledger transactions on record.');
  } else {
    autoTable(
      doc,
      tableOpts(doc, {
        startY: y,
        head: [['Type', 'Amount', 'Status', 'Description / Memo', 'Ref', 'Date']],
        body: ledger.map((tx) => [
          tx.type || '—',
          fmtETB(tx.amount),
          tx.status || '—',
          tx.description || '—',
          tx.chapaTxRef || '—',
          fmtDate(tx.createdAt),
        ]),
        columnStyles: {
          0: { cellWidth: 78 },
          1: { cellWidth: 72, halign: 'right' },
          2: { cellWidth: 58 },
          3: { cellWidth: 'auto' },
          4: { cellWidth: 74 },
          5: { cellWidth: 70 },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          if (data.column.index === 1) {
            const amt = Number(String(data.cell.raw).replace(/[^0-9.-]/g, ''));
            data.cell.styles.textColor = amt < 0 ? RED : DARK;
          }
          if (data.column.index === 2) {
            data.cell.styles.textColor = statusColor(String(data.cell.raw).toLowerCase());
          }
        },
      })
    );
  }

  // ── 7 · Withdrawal Payout Requests ──────────────────────────────────────────
  y = (ledger.length ? doc.lastAutoTable.finalY : y) + 16;
  y = ensureRoom(doc, y, 92);
  y = sectionHeader(doc, y, 7, 'Withdrawal Payout Requests', 'Payout requests and their processing status');
  if (!withdrawals.length) {
    emptyNote(doc, y + 12, 'No withdrawal requests on record.');
  } else {
    autoTable(
      doc,
      tableOpts(doc, {
        startY: y,
        head: [['Amount', 'Bank / Channel', 'Account Number', 'Status', 'Requested', 'Processed']],
        body: withdrawals.map((w) => [
          fmtETB(w.amount),
          w.bankName || '—',
          w.accountNumber || w.telebirrNumber || '—',
          (w.status || 'pending').toUpperCase(),
          fmtDate(w.requestedAt || w.createdAt),
          fmtDate(w.processedAt),
        ]),
        columnStyles: { 0: { cellWidth: 78, halign: 'right' }, 1: { cellWidth: 84 } },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            data.cell.styles.textColor = statusColor(String(data.cell.raw).toLowerCase());
          }
        },
      })
    );
  }

  footer();

  const safeName = (student.name || 'learner').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
  doc.save(`ethio-lingo-student-report-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export default downloadStudentReportPdf;
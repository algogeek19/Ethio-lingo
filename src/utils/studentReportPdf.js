import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─────────────────────────────────────────────────────────────────────────────
// Student Information Report — PDF generator (admin panel)
// Builds a complete PDF dossier for a learner: identity & contact details,
// demographics, wallet / staking summary, daily progress, exam history,
// full financial ledger, and withdrawal requests.
// ─────────────────────────────────────────────────────────────────────────────

const CORAL = [143, 72, 47];
const DARK = [24, 23, 21];
const LIGHT_BG = [250, 249, 245];
const GREEN = [93, 184, 114];
const RED = [198, 69, 69];
const AMBER = [232, 165, 90];
const MUTED = [108, 106, 100];

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
  })
    .format(amount)
    .replace('ETB', 'ETB ');

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

const sectionHeader = (doc, y, title, subtitle = '') => {
  doc.setFillColor(...CORAL);
  const boxX = 14;
  let cursor = y;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...CORAL);
  doc.text(title, boxX + 2, cursor - 8);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, boxX + 2, cursor - 3);
  }
  doc.setDrawColor(...CORAL);
  doc.setLineWidth(0.5);
  doc.line(boxX, cursor, doc.internal.pageSize.getWidth() - 14, cursor);
  return cursor + 6;
};

// If the given Y is too close to the bottom of the current page, start a new page.
const ensureRoom = (doc, y, minBottomMargin = 70) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y > pageHeight - minBottomMargin) {
    doc.addPage();
    return 60;
  }
  return y;
};

const keyValueRow = (doc, keys, values, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const colW = (pageWidth - margin * 2) / 3;
  const rowH = 14;
  let cursor = startY;

  keys.forEach((k, i) => {
    const col = i % 3;
    if (col === 0 && i > 0) cursor += rowH;
    const x = margin + col * colW;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(k.toUpperCase(), x, cursor);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    const v = values[i] === undefined || values[i] === null || values[i] === '' ? '—' : String(values[i]);
    doc.text(doc.splitTextToSize(v, colW - 6), x, cursor + 5);
  });

  return cursor + rowH + 4;
};

/**
 * Generate and trigger a download of the full student PDF report.
 * @param {object} student - Full learner record from api.getLearnerDetails()
 * @returns {void}
 */
export const downloadStudentReportPdf = (student) => {
  if (!student) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const wallet = student.wallet || {};
  const progress = Array.isArray(student.dailyProgress) ? student.dailyProgress : [];
  const attempts = Array.isArray(student.examAttempts) ? student.examAttempts : [];
  const ledger = Array.isArray(student.ledgerTransactions) ? student.ledgerTransactions : [];
  const withdrawals = Array.isArray(student.withdrawals) ? student.withdrawals : [];

  const interests = parseJsonArray(student.interests);
  const listeningCategories = parseJsonArray(student.listeningCategories);

  const footer = () => {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(
        `Ethio-Lingo • Student Information Report • Generated ${new Date().toLocaleString()} • Page ${i} of ${pages}`,
        pageWidth / 2,
        pageHeight - 22,
        { align: 'center' }
      );
    }
  };

  // ── PAGE 1: Header ─────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageWidth, 96, 'F');
  doc.setFillColor(...CORAL);
  doc.rect(0, 96, pageWidth, 3, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('ETHIO-LINGO', margin, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(232, 165, 90);
  doc.text('STUDENT INFORMATION REPORT', margin, 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 195, 188);
  doc.text(
    `Learner ID: ${student.id || '—'}   •   Generated: ${fmtDateTime(new Date().toISOString())}`,
    margin,
    78
  );

  // ── Section: Identity & Contact ────────────────────────────────────────────
  let y = sectionHeader(doc, 120, '1. Identity & Contact Details');
  y = keyValueRow(
    doc,
    ['Full Name', 'Email Address', 'Phone Number'],
    [student.name, student.email, student.phone],
    y
  );
  y = keyValueRow(
    doc,
    ['Account Status', 'Curriculum Level', 'Current Day'],
    [student.status || (student.isActive ? 'ACTIVE' : 'SUSPENDED'), student.level || 'Beginner I', `Day ${student.currentDay || 1}`],
    y
  );
  y = keyValueRow(
    doc,
    ['Member Since', 'Account State', 'Messaging Status'],
    [
      fmtDate(student.createdAt),
      student.isBanned ? 'BANNED' : student.isActive ? 'Active' : 'Disabled',
      student.isBanned ? 'Banned' : 'Allowed',
    ],
    y
  );

  // ── Section: Demographics & Preferences ────────────────────────────────────
  y = sectionHeader(doc, y + 4, '2. Demographics & Learning Preferences');
  y = keyValueRow(
    doc,
    ['Age', 'Interests', 'Daily Listening Track'],
    [student.age ?? '—', interests.length ? interests.join(', ') : '—', student.listeningMinutesPerDay ? `${student.listeningMinutesPerDay} min / day` : '—'],
    y
  );
  y = keyValueRow(
    doc,
    ['Listening Categories', 'Timezone', 'Free Trial'],
    [listeningCategories.length ? listeningCategories.join(', ') : '—', student.timezone || 'Africa/Addis_Ababa', wallet.isFreeTrial ? `Active (${wallet.freeTrialDaysLeft ?? 0} days left)` : 'Staked Mode'],
    y
  );

  // ── Section: Wallet & Staking Summary ──────────────────────────────────────
  y = sectionHeader(doc, y + 4, '3. Wallet & Staking Summary');
  y = keyValueRow(
    doc,
    ['Staked Escrow Vault', 'Available Balance', 'Continuous Streak'],
    [fmtETB(wallet.stakedAmount), fmtETB(wallet.availableBalance), `${wallet.streakCount || 0} day(s)`],
    y
  );
  y = keyValueRow(
    doc,
    ['Total Penalties Slashed', 'Total Platform Fees', 'Last Completed Day'],
    [fmtETB(wallet.totalPenalties), fmtETB(wallet.totalPlatformFees), wallet.lastCompletedDate || '—'],
    y
  );

  // ── Section: Daily Progress ────────────────────────────────────────────────
  y = sectionHeader(doc, y + 4, '4. Daily Task & Exam Progress');
  autoTable(doc, {
    startY: y,
    head: [['Day', 'Date', 'Level', 'Task 1 (Lesson)', 'Task 2 (Listening)', 'Exam Score', 'Result']],
    body: progress.length
      ? progress.map((p) => [
          `Day ${p.dayNumber}`,
          p.progressDate || '—',
          p.level || '—',
          p.task1LessonCompleted ? 'Completed' : 'Pending',
          p.task2ListeningCompleted ? 'Completed' : 'Pending',
          p.examCompleted ? `${p.examScore}/20` : 'Not Attempted',
          p.examCompleted ? (p.examPassed ? 'PASSED' : 'FAILED') : '—',
        ])
      : [['No daily progress recorded yet.', '', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: CORAL, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const v = String(data.cell.raw || '');
        if (v === 'PASSED') data.cell.styles.textColor = GREEN;
        else if (v === 'FAILED') data.cell.styles.textColor = RED;
      }
      if (data.section === 'body' && data.column.index === 5) {
        const v = String(data.cell.raw || '');
        if (v.includes('Not') ) data.cell.styles.textColor = MUTED;
        else data.cell.styles.textColor = DARK;
      }
    },
  });

  // ── Section: Exam History ──────────────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 16;
  y = ensureRoom(doc, y);
  y = sectionHeader(doc, y, '5. Exam History');
  autoTable(doc, {
    startY: y,
    head: [['Day', 'Level', 'Score', 'Pass Mark', 'Result', 'Date']],
    body: attempts.length
      ? attempts.map((a) => [
          `Day ${a.dayNumber}`,
          a.level || '—',
          `${a.score}/${a.totalQuestions || 20}`,
          `${a.passThreshold || 0}/${a.totalQuestions || 20}`,
          a.passed ? 'PASSED' : 'FAILED',
          fmtDate(a.createdAt),
        ])
      : [['No exam attempts recorded yet.', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: CORAL, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = String(data.cell.raw) === 'PASSED' ? GREEN : RED;
      }
    },
  });

  // ── Section: Financial Ledger ──────────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 16;
  y = ensureRoom(doc, y);
  doc.addPage();
  y = sectionHeader(doc, 120, '6. Financial Ledger (Money History)');
  autoTable(doc, {
    startY: y,
    head: [['Type', 'Amount', 'Status', 'Description / Memo', 'Ref', 'Date']],
    body: ledger.length
      ? ledger.map((tx) => [
          tx.type || '—',
          fmtETB(tx.amount),
          tx.status || '—',
          tx.description || '—',
          tx.chapaTxRef || '—',
          fmtDate(tx.createdAt),
        ])
      : [['No ledger transactions on record.', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: CORAL, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 70, halign: 'right' },
      2: { cellWidth: 55 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 75 },
      5: { cellWidth: 65 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const amt = Number(String(data.cell.raw).replace(/[^0-9.-]/g, ''));
        data.cell.styles.textColor = amt < 0 ? RED : GREEN;
      }
      if (data.section === 'body' && data.column.index === 2) {
        const s = String(data.cell.raw).toLowerCase();
        if (['success', 'completed'].includes(s)) data.cell.styles.textColor = GREEN;
        else if (s === 'penalty') data.cell.styles.textColor = RED;
        else if (s === 'pending') data.cell.styles.textColor = AMBER;
        else data.cell.styles.textColor = MUTED;
      }
    },
  });

  // ── Section: Withdrawal Requests ───────────────────────────────────────────
  y = doc.lastAutoTable.finalY + 16;
  y = ensureRoom(doc, y);
  y = sectionHeader(doc, y, '7. Withdrawal Payout Requests');
  autoTable(doc, {
    startY: y,
    head: [['Amount', 'Bank / Channel', 'Account Number', 'Status', 'Requested', 'Processed']],
    body: withdrawals.length
      ? withdrawals.map((w) => [
          fmtETB(w.amount),
          w.bankName || '—',
          w.accountNumber || w.telebirrNumber || '—',
          (w.status || 'pending').toUpperCase(),
          fmtDate(w.requestedAt || w.createdAt),
          fmtDate(w.processedAt),
        ])
      : [['No withdrawal requests on record.', '', '', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: CORAL, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT_BG },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const s = String(data.cell.raw).toLowerCase();
        if (['approved', 'completed'].includes(s)) data.cell.styles.textColor = GREEN;
        else if (s === 'declined') data.cell.styles.textColor = RED;
        else if (s === 'pending') data.cell.styles.textColor = AMBER;
        else data.cell.styles.textColor = MUTED;
      }
    },
  });

  footer();

  const safeName = (student.name || 'learner').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
  doc.save(`ethio-lingo-student-report-${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export default downloadStudentReportPdf;
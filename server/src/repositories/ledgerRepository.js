import { prisma } from '../config/database.js';
import { safeDbQuery } from '../utils/dbHelper.js';

const MOCK_LEDGER = [
  {
    id: 'tx-01',
    userId: 'usr_learner_001',
    type: 'CHAPA_DEPOSIT',
    amount: 1000.0,
    status: 'COMPLETED',
    description: 'Initial Escrow Deposit of 1000 ETB (10% fee: 100 ETB, Net Stake: 900 ETB)',
    createdAt: new Date(),
  },
];

export const createLedgerEntry = async (entryData) => {
  const newEntry = {
    id: `tx-${Math.floor(100 + Math.random() * 900)}`,
    ...entryData,
    createdAt: new Date(),
  };

  return await safeDbQuery(
    () => prisma.ledgerTransaction.create({ data: entryData }),
    () => {
      MOCK_LEDGER.unshift(newEntry);
      return newEntry;
    }
  );
};

export const findLedgerEntriesByUserId = async (userId) => {
  return await safeDbQuery(
    () => prisma.ledgerTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    () => MOCK_LEDGER.filter((l) => l.userId === userId)
  );
};

export const findAllLedgerEntries = async () => {
  return await safeDbQuery(
    () => prisma.ledgerTransaction.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' } }),
    () => MOCK_LEDGER
  );
};

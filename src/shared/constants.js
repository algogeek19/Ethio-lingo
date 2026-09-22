export const STAKE_TIERS = [
  { amount: 500, penaltyRate: 25, label: 'Starter Tier' },
  { amount: 1500, penaltyRate: 50, label: 'Scholarly Tier' },
  { amount: 3000, penaltyRate: 100, label: 'Mastery Tier' },
];

export const INITIAL_USER = {
  name: 'Learner',
  email: '',
  avatar: '',
  joinedDate: '',
  tier: 'Free Trial',
};

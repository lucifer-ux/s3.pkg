/**
 * Dummy Bureau API Service
 * Simulates credit bureau data fetching for demo purposes
 */

const MOCK_BUREAU_DATABASE = [
  {
    panNumber: 'ABCDE1234F',
    cibilScore: 785,
    totalAccounts: 4,
    activeAccounts: 2,
    overdueAmount: 0,
    creditHistory: 72, // months
    status: 'EXCELLENT'
  },
  {
    panNumber: 'FGHIJ5678K',
    cibilScore: 720,
    totalAccounts: 6,
    activeAccounts: 3,
    overdueAmount: 0,
    creditHistory: 48,
    status: 'GOOD'
  },
  {
    panNumber: 'KLMNO9012P',
    cibilScore: 650,
    totalAccounts: 5,
    activeAccounts: 3,
    overdueAmount: 5000,
    creditHistory: 36,
    status: 'FAIR'
  },
  {
    panNumber: 'QRSTU3456V',
    cibilScore: 580,
    totalAccounts: 3,
    activeAccounts: 2,
    overdueAmount: 15000,
    creditHistory: 24,
    status: 'POOR'
  },
  {
    panNumber: 'WXYZA7890B',
    cibilScore: 820,
    totalAccounts: 8,
    activeAccounts: 3,
    overdueAmount: 0,
    creditHistory: 96,
    status: 'EXCELLENT'
  }
];

/**
 * Fetch bureau data based on PAN number
 * @param {string} panNumber - Customer PAN number
 * @returns {Promise<Object>} Bureau data object
 */
export const fetchBureauData = async (panNumber) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Find matching bureau record or generate one
  const bureauRecord = MOCK_BUREAU_DATABASE.find(
    record => record.panNumber === panNumber.toUpperCase()
  );
  
  if (bureauRecord) {
    return {
      success: true,
      data: bureauRecord
    };
  }
  
  // Generate deterministic mock data for unknown PANs
  const hash = panNumber.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const cibilScore = 600 + Math.abs(hash % 300);
  let creditStatus = 'FAIR';
  if (cibilScore >= 750) creditStatus = 'EXCELLENT';
  else if (cibilScore >= 700) creditStatus = 'GOOD';
  else if (cibilScore >= 600) creditStatus = 'FAIR';
  else creditStatus = 'POOR';
  
  return {
    success: true,
    data: {
      panNumber: panNumber.toUpperCase(),
      cibilScore,
      totalAccounts: 3 + Math.abs(hash % 7),
      activeAccounts: 1 + Math.abs(hash % 4),
      overdueAmount: cibilScore < 650 ? Math.abs(hash % 20000) : 0,
      creditHistory: 12 + Math.abs(hash % 84),
      status
    }
  };
};

/**
 * Get loan offers based on bureau score
 * @param {Object} bureauData - Bureau data object
 * @returns {Array} Array of available loan offers
 */
export const getLoanOffers = (bureauData) => {
  const { cibilScore, status } = bureauData;
  
  const baseOffers = [
    {
      id: 'personal-loan-basic',
      category: 'Personal Loan',
      name: 'Personal Loan Basic',
      minAmount: 50000,
      maxAmount: 200000,
      interestRate: 14.5,
      tenure: 12,
      processingFee: 1999,
      eligibility: cibilScore >= 600,
      features: ['Quick approval', 'Minimal documentation', 'Flexible repayment'],
      icon: 'Wallet'
    },
    {
      id: 'personal-loan-premium',
      category: 'Personal Loan',
      name: 'Personal Loan Premium',
      minAmount: 200000,
      maxAmount: 1000000,
      interestRate: 11.99,
      tenure: 24,
      processingFee: 2999,
      eligibility: cibilScore >= 750,
      features: ['Lowest interest rate', 'Higher loan amount', 'Priority processing'],
      icon: 'Crown'
    },
    {
      id: 'consumer-durable',
      category: 'Consumer Durable',
      name: 'Electronics & Appliances',
      minAmount: 10000,
      maxAmount: 150000,
      interestRate: 0,
      tenure: 6,
      processingFee: 499,
      eligibility: cibilScore >= 650,
      features: ['0% EMI', 'Instant approval', 'Wide merchant network'],
      icon: 'Smartphone'
    },
    {
      id: 'two-wheeler',
      category: 'Vehicle Loan',
      name: 'Two Wheeler Loan',
      minAmount: 30000,
      maxAmount: 300000,
      interestRate: 8.5,
      tenure: 36,
      processingFee: 999,
      eligibility: cibilScore >= 650,
      features: ['Low down payment', 'Flexible EMIs', 'Quick disbursal'],
      icon: 'Bike'
    },
    {
      id: 'credit-card-basic',
      category: 'Credit Card',
      name: 'Shopping Card Basic',
      creditLimit: 50000,
      annualFee: 499,
      eligibility: cibilScore >= 650,
      features: ['1% cashback on all purchases', 'Fuel surcharge waiver', 'Lounge access'],
      icon: 'CreditCard'
    },
    {
      id: 'credit-card-premium',
      category: 'Credit Card',
      name: 'Shopping Card Premium',
      creditLimit: 200000,
      annualFee: 2999,
      eligibility: cibilScore >= 750,
      features: ['5% cashback on shopping', 'Airport lounge access', 'Travel insurance'],
      icon: 'Gem'
    },
    {
      id: 'emi-card',
      category: 'EMI Card',
      name: 'Insta EMI Card',
      preApprovedLimit: 100000,
      validity: 36,
      annualFee: 0,
      eligibility: cibilScore >= 600,
      features: ['Pre-approved limit', 'Instant EMI conversion', 'No cost EMI options'],
      icon: 'Card'
    }
  ];
  
  return baseOffers.filter(offer => offer.eligibility);
};

/**
 * Get offer categories for grouping
 */
export const getOfferCategories = () => [
  { id: 'personal-loan', name: 'Personal Loans', icon: 'Wallet', color: 'blue' },
  { id: 'consumer-durable', name: 'Consumer Durables', icon: 'Smartphone', color: 'purple' },
  { id: 'vehicle-loan', name: 'Vehicle Loans', icon: 'Bike', color: 'green' },
  { id: 'credit-card', name: 'Credit Cards', icon: 'CreditCard', color: 'orange' },
  { id: 'emi-card', name: 'EMI Cards', icon: 'Card', color: 'pink' }
];

export default {
  fetchBureauData,
  getLoanOffers,
  getOfferCategories
};

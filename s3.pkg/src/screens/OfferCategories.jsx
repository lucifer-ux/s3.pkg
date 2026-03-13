import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Smartphone,
  Bike,
  CreditCard,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  Crown,
  Gem,
  TrendingUp,
  Percent,
  Clock,
  Zap,
  Shield,
  Bot,
  MessageCircle,
  Award,
  Star
} from 'lucide-react';
import { useLoan } from '../context/LoanContext';
import bureauService from '../services/bureauService';

// Icon mapping for dynamic rendering
const ICON_MAP = {
  Wallet,
  Smartphone,
  Bike,
  CreditCard,
  Card,
  Crown,
  Gem
};

// Category configuration with colors and gradients
const CATEGORY_CONFIG = {
  'Personal Loan': {
    color: 'blue',
    gradient: 'from-blue-500 to-cyan-400',
    bgGradient: 'from-blue-50 to-cyan-50',
    borderColor: 'border-blue-200',
    shadowColor: 'shadow-blue-500/20',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    icon: Wallet
  },
  'Consumer Durable': {
    color: 'purple',
    gradient: 'from-purple-500 to-violet-400',
    bgGradient: 'from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    shadowColor: 'shadow-purple-500/20',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    icon: Smartphone
  },
  'Vehicle Loan': {
    color: 'green',
    gradient: 'from-emerald-500 to-teal-400',
    bgGradient: 'from-emerald-50 to-teal-50',
    borderColor: 'border-emerald-200',
    shadowColor: 'shadow-emerald-500/20',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    icon: Bike
  },
  'Credit Card': {
    color: 'orange',
    gradient: 'from-orange-500 to-amber-400',
    bgGradient: 'from-orange-50 to-amber-50',
    borderColor: 'border-orange-200',
    shadowColor: 'shadow-orange-500/20',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    icon: CreditCard
  },
  'EMI Card': {
    color: 'pink',
    gradient: 'from-pink-500 to-rose-400',
    bgGradient: 'from-pink-50 to-rose-50',
    borderColor: 'border-pink-200',
    shadowColor: 'shadow-pink-500/20',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-500',
    lightBg: 'bg-pink-50',
    icon: Card
  }
};

// CIBIL Score gauge component
const CibilGauge = ({ score, status }) => {
  const getScoreColor = (score) => {
    if (score >= 750) return 'from-emerald-400 to-emerald-500';
    if (score >= 700) return 'from-blue-400 to-blue-500';
    if (score >= 600) return 'from-amber-400 to-amber-500';
    return 'from-red-400 to-red-500';
  };

  const getScoreLabel = (status) => {
    const labels = {
      'EXCELLENT': 'Excellent',
      'GOOD': 'Good',
      'FAIR': 'Fair',
      'POOR': 'Poor'
    };
    return labels[status] || status;
  };

  const percentage = Math.min(Math.max((score - 300) / 600 * 100, 0), 100);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getScoreColor(score)} flex items-center justify-center shadow-lg`}>
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-[#6b6375]">Your CIBIL Score</p>
            <p className="text-2xl font-bold text-[#08060d]">{score}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full ${score >= 700 ? 'bg-emerald-100 text-emerald-700' : score >= 600 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'} font-medium text-sm`}>
          {getScoreLabel(status)}
        </div>
      </div>

      {/* Score Bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getScoreColor(score)} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Score Range Labels */}
      <div className="flex justify-between mt-2 text-xs text-[#6b6375]">
        <span>300</span>
        <span>450</span>
        <span>600</span>
        <span>750</span>
        <span>900</span>
      </div>
    </div>
  );
};

// Category Tab Component
const CategoryTab = ({ category, isActive, onClick, count }) => {
  const config = CATEGORY_CONFIG[category.name] || CATEGORY_CONFIG['Personal Loan'];
  const IconComponent = config.icon;

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 group relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 min-w-[100px] ${
        isActive
          ? `bg-gradient-to-br ${config.gradient} text-white shadow-lg ${config.shadowColor} scale-105`
          : 'bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-purple-200 hover:shadow-md'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
        isActive ? 'bg-white/20' : `bg-gradient-to-br ${config.bgGradient}`
      }`}>
        <IconComponent className={`w-6 h-6 ${isActive ? 'text-white' : config.textColor}`} />
      </div>
      <span className={`text-xs font-medium text-center leading-tight ${isActive ? 'text-white' : 'text-[#6b6375]'}`}>
        {category.name}
      </span>
      {count > 0 && (
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          isActive ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
};

// Feature Tag Component
const FeatureTag = ({ text, index }) => (
  <span
    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-[#6b6375] border border-gray-100 animate-in fade-in slide-in-from-bottom-2"
    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
  >
    <Zap className="w-3 h-3 mr-1 text-[#aa3bff]" />
    {text}
  </span>
);

// Offer Card Component
const OfferCard = ({ offer, onClick, index }) => {
  const config = CATEGORY_CONFIG[offer.category] || CATEGORY_CONFIG['Personal Loan'];
  const IconComponent = ICON_MAP[offer.icon] || Wallet;

  const formatAmount = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    }
    return `₹${(amount / 1000).toFixed(0)}K`;
  };

  return (
    <div
      onClick={onClick}
      className="group bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg shadow-gray-900/5 border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-purple-200 animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Card Header */}
      <div className={`h-24 bg-gradient-to-br ${config.gradient} relative overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />

        <div className="relative z-10 p-5 flex items-start justify-between">
          <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg`}>
            <IconComponent className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            <span className="text-xs font-semibold text-white">Pre-approved</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5">
        {/* Category Badge */}
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.lightBg} ${config.textColor} mb-3`}>
          {offer.category}
        </span>

        {/* Offer Name */}
        <h3 className="text-lg font-semibold text-[#08060d] mb-3 leading-tight">
          {offer.name}
        </h3>

        {/* Amount/Credit Limit */}
        <div className="flex items-center gap-4 mb-4">
          {offer.minAmount && offer.maxAmount ? (
            <div>
              <p className="text-xs text-[#6b6375] mb-0.5">Loan Amount</p>
              <p className="text-lg font-bold text-[#08060d]">
                {formatAmount(offer.minAmount)} - {formatAmount(offer.maxAmount)}
              </p>
            </div>
          ) : offer.creditLimit ? (
            <div>
              <p className="text-xs text-[#6b6375] mb-0.5">Credit Limit</p>
              <p className="text-lg font-bold text-[#08060d]">
                {formatAmount(offer.creditLimit)}
              </p>
            </div>
          ) : offer.preApprovedLimit ? (
            <div>
              <p className="text-xs text-[#6b6375] mb-0.5">Pre-approved Limit</p>
              <p className="text-lg font-bold text-[#08060d]">
                {formatAmount(offer.preApprovedLimit)}
              </p>
            </div>
          ) : null}
        </div>

        {/* Interest Rate / Fees */}
        <div className="flex items-center gap-4 mb-4">
          {offer.interestRate !== undefined && (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${config.lightBg} flex items-center justify-center`}>
                <Percent className={`w-4 h-4 ${config.textColor}`} />
              </div>
              <div>
                <p className="text-xs text-[#6b6375]">Interest</p>
                <p className="text-sm font-semibold text-[#08060d]">
                  {offer.interestRate === 0 ? '0% EMI' : `${offer.interestRate}%`}
                </p>
              </div>
            </div>
          )}
          {offer.processingFee && (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${config.lightBg} flex items-center justify-center`}>
                <Award className={`w-4 h-4 ${config.textColor}`} />
              </div>
              <div>
                <p className="text-xs text-[#6b6375]">Processing Fee</p>
                <p className="text-sm font-semibold text-[#08060d]">₹{offer.processingFee}</p>
              </div>
            </div>
          )}
          {offer.annualFee !== undefined && (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${config.lightBg} flex items-center justify-center`}>
                <Clock className={`w-4 h-4 ${config.textColor}`} />
              </div>
              <div>
                <p className="text-xs text-[#6b6375]">Annual Fee</p>
                <p className="text-sm font-semibold text-[#08060d]">
                  {offer.annualFee === 0 ? 'Free' : `₹${offer.annualFee}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-5">
          {offer.features.slice(0, 3).map((feature, idx) => (
            <FeatureTag key={idx} text={feature} index={idx} />
          ))}
        </div>

        {/* CTA Button */}
        <button className={`w-full group/btn flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm transition-all duration-300 bg-gradient-to-r ${config.gradient} text-white shadow-lg ${config.shadowColor} hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}>
          <span>View Details</span>
          <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

// AI Assistant Banner Component
const AIAssistantBanner = ({ onClick }) => (
  <div
    onClick={onClick}
    className="fixed bottom-24 right-4 z-50 cursor-pointer group"
  >
    <div className="relative">
      {/* Pulsing background */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#aa3bff] to-purple-600 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 animate-pulse" />

      {/* Main button */}
      <div className="relative flex items-center gap-3 bg-gradient-to-r from-[#aa3bff] to-purple-600 text-white px-4 py-3 rounded-full shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Bot className="w-5 h-5" />
        </div>
        <div className="hidden sm:block">
          <p className="text-xs font-medium opacity-90">Need help?</p>
          <p className="text-sm font-semibold">Ask AI Assistant</p>
        </div>
        <MessageCircle className="w-5 h-5 sm:hidden" />
      </div>

      {/* Floating sparkle */}
      <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-300 animate-bounce" />
    </div>
  </div>
);

// Main Component
const OfferCategories = () => {
  const navigate = useNavigate();
  const { loanData } = useLoan();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAIChat, setShowAIChat] = useState(false);

  const offers = useMemo(() => {
    const bureauData = loanData.bureauData || {
      cibilScore: 785,
      status: 'EXCELLENT',
      panNumber: 'ABCDE1234F'
    };
    return bureauService.getLoanOffers(bureauData);
  }, [loanData.bureauData]);

  const categories = useMemo(() => {
    return bureauService.getOfferCategories();
  }, []);

  // Filter offers by category
  const filteredOffers = useMemo(() => {
    if (selectedCategory === 'all') return offers;

    const categoryMap = {
      'personal-loan': 'Personal Loan',
      'consumer-durable': 'Consumer Durable',
      'vehicle-loan': 'Vehicle Loan',
      'credit-card': 'Credit Card',
      'emi-card': 'EMI Card'
    };

    const targetCategory = categoryMap[selectedCategory];
    return offers.filter(offer => offer.category === targetCategory);
  }, [offers, selectedCategory]);

  // Count offers per category
  const categoryCounts = useMemo(() => {
    const counts = {};
    categories.forEach(cat => {
      const categoryMap = {
        'personal-loan': 'Personal Loan',
        'consumer-durable': 'Consumer Durable',
        'vehicle-loan': 'Vehicle Loan',
        'credit-card': 'Credit Card',
        'emi-card': 'EMI Card'
      };
      const targetCategory = categoryMap[cat.id];
      counts[cat.id] = offers.filter(offer => offer.category === targetCategory).length;
    });
    return counts;
  }, [offers, categories]);

  const handleOfferClick = (offerId) => {
    navigate(`/offer-detail/${offerId}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-[#08060d]">QuickLoan</span>
          </div>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-purple-100">
            <Shield className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-xs font-medium text-[#6b6375]">Secure</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-6 relative z-10 pb-32">
        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((step, index) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === 3
                  ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500'
                  : index < 3
                    ? 'w-4 bg-gradient-to-r from-indigo-500 to-purple-500'
                    : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Congratulations Banner */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-xl shadow-purple-500/25 p-6 mb-6 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -ml-10 -mb-10" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Award className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium opacity-90">Pre-approved Offers</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">
              Congratulations! 🎉
            </h1>
            <p className="text-white/90">
              You have <span className="font-bold text-white">{offers.length}</span> pre-approved offers waiting for you
            </p>
          </div>
        </div>

        {/* CIBIL Score Gauge */}
        <div className="mb-6">
          <CibilGauge 
            score={loanData.bureauData?.cibilScore || 785} 
            status={loanData.bureauData?.status || 'EXCELLENT'} 
          />
        </div>

        {/* Category Tabs */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[#08060d] mb-4">Browse by Category</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 group relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 min-w-[90px] ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-br from-gray-700 to-gray-900 text-white shadow-lg shadow-gray-500/25 scale-105'
                  : 'bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-purple-200 hover:shadow-md'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                selectedCategory === 'all' ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                <Wallet className={`w-6 h-6 ${selectedCategory === 'all' ? 'text-white' : 'text-gray-600'}`} />
              </div>
              <span className={`text-xs font-medium text-center leading-tight ${selectedCategory === 'all' ? 'text-white' : 'text-[#6b6375]'}`}>
                All Offers
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                selectedCategory === 'all' ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {offers.length}
              </span>
            </button>

            {categories.map((category) => (
              <CategoryTab
                key={category.id}
                category={category}
                isActive={selectedCategory === category.id}
                onClick={() => setSelectedCategory(category.id)}
                count={categoryCounts[category.id] || 0}
              />
            ))}
          </div>
        </div>

        {/* Offers Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#08060d]">
              {selectedCategory === 'all' ? 'All Offers' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            <span className="text-sm text-[#6b6375]">
              {filteredOffers.length} {filteredOffers.length === 1 ? 'offer' : 'offers'}
            </span>
          </div>

          {filteredOffers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOffers.map((offer, index) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onClick={() => handleOfferClick(offer.id)}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Wallet className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-[#08060d] mb-2">No offers available</h3>
              <p className="text-sm text-[#6b6375]">
                Try selecting a different category or check back later for new offers.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* AI Assistant Banner */}
      <AIAssistantBanner onClick={() => setShowAIChat(true)} />

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#aa3bff] to-purple-600 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs opacity-90">Here to help you choose</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAIChat(false)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5">
              <p className="text-sm text-[#6b6375] mb-4">
                I can help you understand your offers and find the best one for your needs. What would you like to know?
              </p>

              <div className="space-y-2">
                {[
                  'Which offer has the lowest interest rate?',
                  'What is the difference between EMI Card and Credit Card?',
                  'How much can I borrow with my CIBIL score?',
                  'Explain the processing fees'
                ].map((question, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-purple-50 border border-gray-100 hover:border-purple-200 transition-all duration-200 group"
                  >
                    <span className="text-sm text-[#08060d] group-hover:text-[#aa3bff] transition-colors">
                      {question}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowAIChat(false)}
                  className="w-full py-3 rounded-xl bg-gray-100 text-[#6b6375] font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default OfferCategories;

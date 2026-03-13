import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Send,
  ChevronLeft,
  CheckCircle,
  FileText,
  Calculator,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bot,
  User,
  Wallet,
  Crown,
  Smartphone,
  Bike,
  CreditCard,
  Gem,
  LayoutGrid,
  Shield,
  Percent,
  Receipt,
  AlertCircle,
  ArrowRight,
  Zap
} from 'lucide-react';
import { useLoan } from '../context/LoanContext';
import bureauService from '../services/bureauService';

const iconMap = {
  Wallet,
  Crown,
  Smartphone,
  Bike,
  CreditCard,
  Gem,
  Card: LayoutGrid
};

const PRELOADED_QUESTIONS = [
  "What's the EMI?",
  "Any hidden charges?",
  "Can I prepay?"
];

const getAIResponse = (question, offer) => {
  const responses = {
    "What's the EMI?": offer.interestRate === 0
      ? `Great question! Since this is a 0% interest offer, your EMI would be approximately ₹${Math.round(offer.maxAmount / offer.tenure).toLocaleString()} per month for ${offer.tenure} months. No interest charges apply!`
      : `For this offer at ${offer.interestRate}% interest, your EMI would be approximately ₹${Math.round((offer.maxAmount * (1 + offer.interestRate / 100)) / offer.tenure).toLocaleString()} per month for ${offer.tenure} months. The exact amount may vary based on your approved loan amount.`,
    "Any hidden charges?": `Transparency is our priority! This offer has a processing fee of ₹${offer.processingFee?.toLocaleString() || offer.annualFee?.toLocaleString() || '0'} ${offer.annualFee ? 'per year' : 'one-time'}. There are no hidden charges. All fees are disclosed upfront before you sign.`,
    "Can I prepay?": `Yes! You can prepay your loan anytime after the first 6 EMI payments. A small prepayment fee of 2-4% may apply depending on when you prepay. This helps you save on interest charges. Would you like to know more about prepayment terms?`
  };
  return responses[question] || `That's a great question about ${offer.name}. Based on the offer details, ${offer.features[0]?.toLowerCase() || 'this offer comes with great benefits'}. Is there anything specific you'd like to know?`;
};

const OfferDetail = () => {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const { loanData, updateLoanData } = useLoan();
  const chatEndRef = useRef(null);

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    features: true,
    eligibility: false,
    documents: false,
    terms: false
  });
  const [showEMICalculator, setShowEMICalculator] = useState(false);
  const [loanAmount, setLoanAmount] = useState(100000);
  const [tenure, setTenure] = useState(12);

  const messageIdRef = useRef(0);
  const typingDelayRef = useRef(1500);

  useEffect(() => {
    const fetchOfferDetails = () => {
      setLoading(true);
      setTimeout(() => {
        const bureauData = loanData.bureauData;
        if (bureauData) {
          const offers = bureauService.getLoanOffers(bureauData);
          const foundOffer = offers.find(o => o.id === offerId);
          if (foundOffer) {
            setOffer(foundOffer);
            setLoanAmount(foundOffer.minAmount || 50000);
            setTenure(foundOffer.tenure || 12);
            messageIdRef.current += 1;
            setChatMessages([{
              type: 'ai',
              text: `Hi! I'm your AI assistant for ${foundOffer.name}. I can help explain the terms, calculate EMIs, and answer any questions. What would you like to know?`,
              id: messageIdRef.current
            }]);
          }
        }
        setLoading(false);
      }, 800);
    };

    fetchOfferDetails();
  }, [offerId, loanData.bureauData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const calculateEMI = () => {
    if (!offer || offer.interestRate === 0) {
      return Math.round(loanAmount / tenure);
    }
    const monthlyRate = offer.interestRate / 12 / 100;
    const emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);
    return Math.round(emi);
  };

  const totalPayment = calculateEMI() * tenure;
  const totalInterest = totalPayment - loanAmount;

  const handleSendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || !offer) return;

    messageIdRef.current += 1;
    const userMessage = {
      type: 'user',
      text: messageText,
      id: messageIdRef.current
    };
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    setIsTyping(true);
    typingDelayRef.current = typingDelayRef.current === 1500 ? 2000 : 1500;
    setTimeout(() => {
      messageIdRef.current += 1;
      const aiResponse = {
        type: 'ai',
        text: getAIResponse(messageText, offer),
        id: messageIdRef.current
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, typingDelayRef.current);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSelectOffer = () => {
    updateLoanData('selectedOffer', offer);
    navigate('/kyc-setup');
  };

  const OfferIcon = offer ? iconMap[offer.icon] || Wallet : Wallet;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          <p className="text-[#6b6375] font-medium">Loading offer details...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-6">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-[#08060d] mb-2">Offer Not Found</h2>
          <p className="text-[#6b6375] mb-6">The offer you're looking for doesn't exist or has expired.</p>
          <button
            onClick={() => navigate('/offers')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            Back to Offers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-24">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/offers')}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-purple-100 text-[#6b6375] hover:text-[#08060d] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100">
            <Sparkles className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-sm font-medium text-[#6b6375]">Offer Details</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="relative z-10 px-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg shadow-purple-500/25">
            <OfferIcon className="w-12 h-12 text-white" />
          </div>
          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium mb-2">
            {offer.category}
          </span>
          <h1 className="text-2xl font-bold text-[#08060d] mb-1">{offer.name}</h1>
          <p className="text-sm text-[#6b6375]">Pre-approved for you</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#aa3bff]" />
              <span className="text-sm font-medium text-[#6b6375]">Interest Rate</span>
            </div>
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
              Best Rate
            </span>
          </div>
          <div className="text-center mb-4">
            <span className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {offer.interestRate}%
            </span>
            <p className="text-sm text-[#6b6375] mt-1">per annum</p>
          </div>
          <div className="h-px bg-gray-100 my-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-[#6b6375] mb-1">Loan Amount</p>
              <p className="text-lg font-bold text-[#08060d]">₹{(offer.maxAmount || offer.creditLimit || offer.preApprovedLimit)?.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[#6b6375] mb-1">Processing Fee</p>
              <p className="text-lg font-bold text-[#08060d]">₹{(offer.processingFee || offer.annualFee || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-purple-100/50">
            <Clock className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-[#08060d]">{offer.tenure || offer.validity || 12}</p>
            <p className="text-xs text-[#6b6375]">Months</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-purple-100/50">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-[#08060d]">24h</p>
            <p className="text-xs text-[#6b6375]">Disbursal</p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 text-center border border-purple-100/50">
            <Shield className="w-5 h-5 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-[#08060d]">100%</p>
            <p className="text-xs text-[#6b6375]">Secure</p>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowEMICalculator(!showEMICalculator)}
            className="w-full flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/50 hover:bg-white/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="font-medium text-[#08060d]">EMI Calculator</span>
            </div>
            {showEMICalculator ? (
              <ChevronUp className="w-5 h-5 text-[#6b6375]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#6b6375]" />
            )}
          </button>

          {showEMICalculator && (
            <div className="mt-3 bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-purple-100/50 animate-in slide-in-from-top-2 duration-300">
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-[#6b6375]">Loan Amount</span>
                  <span className="text-sm font-semibold text-[#08060d]">₹{loanAmount.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={offer.minAmount || 10000}
                  max={offer.maxAmount || offer.creditLimit || offer.preApprovedLimit || 100000}
                  step={5000}
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-[#6b6375]">Tenure (months)</span>
                  <span className="text-sm font-semibold text-[#08060d]">{tenure} months</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={offer.tenure || 36}
                  step={3}
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 text-center">
                <p className="text-sm text-[#6b6375] mb-1">Monthly EMI</p>
                <p className="text-3xl font-bold text-[#08060d]">₹{calculateEMI().toLocaleString()}</p>
                <div className="flex justify-center gap-4 mt-3 text-xs">
                  <span className="text-[#6b6375]">Total: ₹{totalPayment.toLocaleString()}</span>
                  <span className="text-[#6b6375]">Interest: ₹{totalInterest.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/50 overflow-hidden">
            <button
              onClick={() => toggleSection('features')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <span className="font-medium text-[#08060d]">Key Features</span>
              </div>
              {expandedSections.features ? (
                <ChevronUp className="w-5 h-5 text-[#6b6375]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6b6375]" />
              )}
            </button>
            {expandedSections.features && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                <ul className="space-y-2">
                  {offer.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[#6b6375]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/50 overflow-hidden">
            <button
              onClick={() => toggleSection('eligibility')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <span className="font-medium text-[#08060d]">Eligibility Criteria</span>
              </div>
              {expandedSections.eligibility ? (
                <ChevronUp className="w-5 h-5 text-[#6b6375]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6b6375]" />
              )}
            </button>
            {expandedSections.eligibility && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Age: 21-60 years</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Minimum income: ₹25,000/month</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Credit score: 650+ (CIBIL)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Employment: Salaried or Self-employed</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/50 overflow-hidden">
            <button
              onClick={() => toggleSection('documents')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <span className="font-medium text-[#08060d]">Documents Required</span>
              </div>
              {expandedSections.documents ? (
                <ChevronUp className="w-5 h-5 text-[#6b6375]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6b6375]" />
              )}
            </button>
            {expandedSections.documents && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">PAN Card</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Aadhaar Card</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Last 3 months bank statements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Salary slips (last 3 months)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#6b6375]">Proof of address</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/50 overflow-hidden">
            <button
              onClick={() => toggleSection('terms')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <span className="font-medium text-[#08060d]">Terms & Conditions</span>
              </div>
              {expandedSections.terms ? (
                <ChevronUp className="w-5 h-5 text-[#6b6375]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#6b6375]" />
              )}
            </button>
            {expandedSections.terms && (
              <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                <ul className="space-y-2 text-sm text-[#6b6375]">
                  <li>• Interest rates are subject to change based on RBI guidelines</li>
                  <li>• Processing fee is non-refundable once loan is approved</li>
                  <li>• Late payment charges: 2% per month on overdue amount</li>
                  <li>• Foreclosure allowed after 6 EMI payments with 4% charges</li>
                  <li>• Loan disbursal subject to document verification</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 overflow-hidden transition-all duration-300 ${isChatExpanded ? 'mb-6' : ''}`}>
          <button
            onClick={() => setIsChatExpanded(!isChatExpanded)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#08060d]">AI Assistant</p>
                <p className="text-xs text-[#6b6375]">Ask me anything about this offer</p>
              </div>
            </div>
            <MessageCircle className="w-5 h-5 text-[#aa3bff]" />
          </button>

          {isChatExpanded && (
            <div className="h-64 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.type === 'user' ? 'bg-purple-100' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  }`}>
                    {msg.type === 'user' ? (
                      <User className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-[#08060d] rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-100 rounded-2xl rounded-bl-none p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {!isChatExpanded && (
            <div className="px-4 pb-4">
              <p className="text-xs text-[#6b6375] mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {PRELOADED_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    onClick={() => {
                      setIsChatExpanded(true);
                      handleSendMessage(question);
                    }}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isChatExpanded && (
            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm text-[#08060d] placeholder:text-gray-400 focus:outline-none focus:border-[#aa3bff] focus:ring-1 focus:ring-[#aa3bff]"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim()}
                  className={`px-4 py-2.5 rounded-xl transition-all ${
                    inputMessage.trim()
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/30'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-purple-100/50 z-20">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSelectOffer}
            className="w-full group flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <span>Select This Offer</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <p className="text-center text-xs text-[#6b6375] mt-2">
            Proceed to KYC verification
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfferDetail;

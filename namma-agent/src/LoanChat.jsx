import { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Camera, 
  Loader2, 
  CheckCircle,
  Wallet,
  Sparkles,
  ArrowRight,
  ArrowRightLeft,
  FileText,
  CreditCard,
  ChevronLeft
} from 'lucide-react';
import PANScanner from './PANScanner';
import './LoanChat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LOAN_OFFERS = [
  {
    id: 1,
    lender: 'HDFC Bank',
    amount: 500000,
    interestRate: '10.5%',
    tenure: '12 months',
    emi: 43958,
    features: ['Instant approval', 'Zero foreclosure charges'],
  },
  {
    id: 2,
    lender: 'Bajaj Finserv',
    amount: 200000,
    interestRate: '0%',
    tenure: '6 months',
    emi: 33333,
    features: ['No cost EMI', 'Zero down payment'],
  },
  {
    id: 3,
    lender: 'IDFC First Bank',
    amount: 300000,
    interestRate: '7.5%',
    tenure: '9 months',
    emi: 34722,
    features: ['Low interest rate', 'No documentation'],
  },
];

function LoanChat({ product, onBackToShopping }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [panData, setPanData] = useState(null);
  const [currentStep, setCurrentStep] = useState('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [showPANScanner, setShowPANScanner] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [kycProgress, setKycProgress] = useState(0);
  const [showOffers, setShowOffers] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const welcomeMessage = product 
      ? `Hi! I see you're interested in financing the ${product.name} priced at $${product.price}. I'm here to help you get a loan quickly. Let's start - please enter your 10-digit mobile number.`
      : "Hi! I'm your AI loan assistant. I'll help you get a personal loan in just a few minutes. Let's start - please enter your 10-digit mobile number.";
    
    addMessage(welcomeMessage, 'assistant', { showPhoneInput: true });
  }, [product]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const addMessage = (text, sender, options = {}) => {
    const newMessage = {
      id: Date.now(),
      text,
      sender,
      timestamp: Date.now(),
      ...options,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const callLLM = async (userMessage, context = {}) => {
    try {
      const chatMessages = messages
        .filter(m => !m.showPhoneInput && !m.showPANOptions && !m.showPANInput && !m.showOffers && !m.showOfferDetails && !m.showOfferActions && !m.showBackToOffers && !m.showSuccess)
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        }));

      chatMessages.push({ role: 'user', content: userMessage });

      const response = await fetch(`${API_URL}/api/chat/loan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          context: {
            productName: product?.name,
            productPrice: product?.price,
            phoneNumber: phoneNumber || undefined,
            panNumber: panData?.panNumber || undefined,
            userName: panData?.name || undefined,
            currentStep,
            ...context,
          },
        }),
      });

      const data = await response.json();
      return data.success ? data.message : null;
    } catch (error) {
      console.error('LLM call failed:', error);
      return null;
    }
  };

  const handlePhoneSubmit = async () => {
    if (inputValue.length !== 10) return;
    
    setPhoneNumber(inputValue);
    addMessage(inputValue, 'user');
    setInputValue('');
    setIsLoading(true);

    const llmResponse = await callLLM(inputValue, { step: 'phone_submitted' });
    
    setIsLoading(false);
    
    if (llmResponse) {
      addMessage(llmResponse, 'assistant', { showPANOptions: true });
    } else {
      addMessage(
        "Thank you! Now I need to verify your identity. Please scan your PAN card or enter the details manually.",
        'assistant',
        { showPANOptions: true }
      );
    }
    setCurrentStep('pan');
  };

  const handlePANScan = () => {
    addMessage("I'll scan my PAN card", 'user');
    setShowPANScanner(true);
  };

  const handlePANManual = () => {
    addMessage("I'll enter details manually", 'user');
    setTimeout(() => {
      addMessage(
        "Please enter your PAN number (format: ABCDE1234F)",
        'assistant',
        { showPANInput: true }
      );
    }, 500);
  };

  const handlePANScanComplete = async (data) => {
    setShowPANScanner(false);
    setPanData(data);
    
    if (data.manualEntry) {
      addMessage(`PAN: ${data.panNumber}`, 'user');
    } else {
      addMessage("PAN card scanned successfully", 'user');
    }
    
    setIsLoading(true);

    const llmResponse = await callLLM(
      data.manualEntry 
        ? `My PAN number is ${data.panNumber} and name is ${data.name}`
        : 'PAN card scanned successfully',
      { step: 'pan_submitted', panData: data }
    );
    
    setIsLoading(false);
    
    if (llmResponse) {
      addMessage(llmResponse, 'assistant');
    } else {
      addMessage(
        `Thanks ${data.name || 'there'}! I'm now fetching your credit profile to find the best loan offers for you.`,
        'assistant'
      );
    }
    
    setCurrentStep('bureau');
    
    setTimeout(async () => {
      setUserProfile({
        name: data.name || 'Customer',
        pan: data.panNumber,
        cibilScore: 785,
        creditHistory: 'Excellent',
      });
      
      const offersMessage = await callLLM(
        'Show me my loan offers based on my credit profile',
        { step: 'fetching_offers', cibilScore: 785 }
      );
      
      addMessage(
        offersMessage || `Excellent news! Your CIBIL score is 785, which qualifies you for premium loan offers. Here are your personalized offers:`,
        'assistant',
        { showOffers: true }
      );
      setShowOffers(true);
      setCurrentStep('offers');
    }, 3000);
  };

  const handleOfferSelect = async (offer) => {
    setSelectedOffer(offer);
    addMessage(`I'm interested in the ${offer.lender} offer`, 'user');
    setIsLoading(true);

    const llmResponse = await callLLM(
      `I'm interested in the ${offer.lender} loan offer of ${formatCurrency(offer.amount)}`,
      { step: 'offer_selected', offer }
    );
    
    setIsLoading(false);
    
    if (llmResponse) {
      addMessage(llmResponse, 'assistant', { showOfferDetails: true, offer });
    } else {
      addMessage(
        `Perfect choice! The ${offer.lender} loan offers you ${formatCurrency(offer.amount)} at ${offer.interestRate} interest rate with an EMI of ${formatCurrency(offer.emi)}/month for ${offer.tenure}.

Key benefits:
${offer.features.map(f => `• ${f}`).join('\n')}`,
        'assistant',
        { showOfferDetails: true, offer }
      );
    }
    setCurrentStep('offer_details');
  };

  const handleShowDetailedTerms = async () => {
    if (!selectedOffer) return;
    
    addMessage("Can you explain the detailed terms and conditions?", 'user');
    setIsLoading(true);

    const llmResponse = await callLLM(
      `Please explain the detailed terms and conditions for the ${selectedOffer.lender} loan offer`,
      { step: 'requesting_detailed_terms', offer: selectedOffer }
    );
    
    setIsLoading(false);
    
    addMessage(
      llmResponse || `Here are the detailed terms for ${selectedOffer.lender} loan:

Interest Rate: ${selectedOffer.interestRate} per annum
Processing Fee: ${formatCurrency(parseInt(selectedOffer.processingFee) || 2500)}
Loan Amount: ${formatCurrency(selectedOffer.amount)}
Tenure: ${selectedOffer.tenure}
EMI: ${formatCurrency(selectedOffer.emi)}/month

Late Payment Charges: 2% per month on overdue amount
Foreclosure: Allowed after 6 months with 4% charges
Partial Payment: Allowed with minimum 3 EMIs worth`,
      'assistant',
      { showOfferActions: true }
    );
  };

  const handleShowBenefits = async () => {
    if (!selectedOffer) return;
    
    addMessage("What are the key benefits of this offer?", 'user');
    setIsLoading(true);

    const llmResponse = await callLLM(
      `What are the key benefits and advantages of the ${selectedOffer.lender} loan offer?`,
      { step: 'requesting_benefits', offer: selectedOffer }
    );
    
    setIsLoading(false);
    
    addMessage(
      llmResponse || `Key benefits of ${selectedOffer.lender} loan:

${selectedOffer.features.map(f => `✓ ${f}`).join('\n')}

Additional Benefits:
✓ Minimal documentation required
✓ Quick approval within 24 hours
✓ Flexible repayment options
✓ No hidden charges
✓ Dedicated customer support`,
      'assistant',
      { showOfferActions: true }
    );
  };

  const handleCompareOffers = async () => {
    addMessage("Can you compare all the offers for me?", 'user');
    setIsLoading(true);

    const llmResponse = await callLLM(
      'Please compare all three loan offers and help me choose the best one',
      { step: 'requesting_comparison', offers: LOAN_OFFERS }
    );
    
    setIsLoading(false);
    
    addMessage(
      llmResponse || `Here's a comparison of all three offers:

**Best Interest Rate:** IDFC First Bank at 7.5%
**Best for Large Amount:** HDFC Bank with ₹5,00,000
**Best for Short Term:** Bajaj Finserv with 0% interest for 6 months

My recommendation: ${selectedOffer?.lender || 'IDFC First Bank'} based on your profile!`,
      'assistant',
      { showBackToOffers: true }
    );
  };

  const handleBackToOffers = () => {
    addMessage("Show me all the offers again", 'user');
    setCurrentStep('offers');
    addMessage(
      "Here are all your personalized loan offers:",
      'assistant',
      { showOffers: true }
    );
  };

  const handleConfirm = async () => {
    addMessage("Yes, let's proceed with the application", 'user');
    setIsLoading(true);

    const llmResponse = await callLLM(
      'Yes, I want to proceed with the loan application',
      { step: 'proceeding_with_application' }
    );
    
    setIsLoading(false);
    
    if (llmResponse) {
      addMessage(llmResponse, 'assistant');
    } else {
      addMessage(
        "Great! I'm setting up your KYC and loan application. This will just take a moment...",
        'assistant'
      );
    }
    
    setCurrentStep('kyc');
    
    const interval = setInterval(() => {
      setKycProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          addMessage(
            `Congratulations! Your loan application has been approved. Your application ID is LN${Date.now().toString().slice(-8)}. The amount will be disbursed to your account within 24 hours.`,
            'assistant',
            { showSuccess: true }
          );
          setCurrentStep('success');
          return 100;
        }
        return prev + 20;
      });
    }, 800);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="loan-chat-container">
      <div className="loan-chat-header">
        <button className="back-button" onClick={onBackToShopping}>
          <ChevronLeft size={24} />
        </button>
        <div className="header-info">
          <div className="header-avatar">
            <Bot size={20} />
          </div>
          <div className="header-text">
            <h3>Loan Assistant</h3>
            <span className="status">Online</span>
          </div>
        </div>
        <div className="placeholder-right" />
      </div>

      <div className="loan-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message-wrapper ${message.sender}`}>
            {message.sender === 'assistant' && (
              <div className="message-avatar assistant-avatar">
                <Bot size={18} />
              </div>
            )}
            
            <div className="message-content">
              <div className="message-label">
                {message.sender === 'user' ? 'YOU' : 'ASSISTANT'}
              </div>
              
              <div className={`message-bubble ${message.sender}`}>
                <p style={{ whiteSpace: 'pre-line' }}>{message.text}</p>
                
                {message.showPhoneInput && currentStep === 'phone' && (
                  <div className="chat-input-wrapper">
                    <div className="phone-input-row">
                      <span className="country-code">+91</span>
                      <input
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={inputValue}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setInputValue(val);
                        }}
                        maxLength={10}
                      />
                    </div>
                    <button 
                      className="send-btn"
                      onClick={handlePhoneSubmit}
                      disabled={inputValue.length !== 10}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                )}

                {message.showPANOptions && currentStep === 'pan' && (
                  <div className="quick-replies">
                    <button className="quick-reply" onClick={handlePANScan}>
                      <Camera size={16} />
                      Scan PAN Card
                    </button>
                    <button className="quick-reply" onClick={handlePANManual}>
                      <CreditCard size={16} />
                      Enter Manually
                    </button>
                  </div>
                )}

                {message.showPANInput && currentStep === 'pan' && (
                  <div className="chat-input-wrapper">
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={inputValue}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                        setInputValue(val);
                      }}
                      maxLength={10}
                    />
                    <button 
                      className="send-btn"
                      onClick={() => {
                        if (inputValue.length === 10) {
                          handlePANScanComplete({
                            panNumber: inputValue,
                            name: 'User',
                            manualEntry: true
                          });
                          setInputValue('');
                        }
                      }}
                      disabled={inputValue.length !== 10}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                )}

                {message.showOffers && showOffers && (
                  <div className="offer-cards-container">
                    {LOAN_OFFERS.map(offer => (
                      <div 
                        key={offer.id} 
                        className="chat-offer-card"
                        onClick={() => handleOfferSelect(offer)}
                      >
                        <div className="offer-card-header">
                          <span className="lender-name">{offer.lender}</span>
                          <ArrowRight size={16} />
                        </div>
                        <div className="offer-card-amount">{formatCurrency(offer.amount)}</div>
                        <div className="offer-card-details">
                          <span>{offer.interestRate} interest</span>
                          <span>{offer.tenure}</span>
                        </div>
                        <div className="offer-card-emi">
                          EMI: {formatCurrency(offer.emi)}/month
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {message.showOfferDetails && currentStep === 'offer_details' && (
                  <div className="quick-replies stacked">
                    <button className="quick-reply" onClick={handleShowDetailedTerms}>
                      <FileText size={16} />
                      Show Detailed Terms
                    </button>
                    <button className="quick-reply" onClick={handleShowBenefits}>
                      <Sparkles size={16} />
                      Explain Benefits
                    </button>
                    <button className="quick-reply" onClick={handleCompareOffers}>
                      <ArrowRightLeft size={16} />
                      Compare All Offers
                    </button>
                    <button className="quick-reply primary" onClick={handleConfirm}>
                      <CheckCircle size={16} />
                      Proceed with Application
                    </button>
                  </div>
                )}

                {message.showOfferActions && (
                  <div className="quick-replies">
                    <button className="quick-reply primary" onClick={handleConfirm}>
                      <CheckCircle size={16} />
                      Proceed with Application
                    </button>
                    <button className="quick-reply" onClick={handleBackToOffers}>
                      <ArrowRight size={16} />
                      Back to Offers
                    </button>
                  </div>
                )}

                {message.showBackToOffers && (
                  <div className="quick-replies">
                    <button className="quick-reply" onClick={handleBackToOffers}>
                      <ArrowRight size={16} />
                      Back to All Offers
                    </button>
                  </div>
                )}

                {message.showSuccess && (
                  <div className="quick-replies">
                    <button className="quick-reply" onClick={onBackToShopping}>
                      <Wallet size={16} />
                      Back to Shopping
                    </button>
                  </div>
                )}
              </div>
              
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
            
            {message.sender === 'user' && (
              <div className="message-avatar user-avatar">
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar">
              <Bot size={18} />
            </div>
            <div className="message-content">
              <div className="message-label">ASSISTANT</div>
              <div className="message-bubble assistant loading">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'kyc' && kycProgress < 100 && (
          <div className="kyc-progress-message">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${kycProgress}%` }} />
            </div>
            <span className="progress-text">{kycProgress}% Complete</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showPANScanner && (
        <PANScanner
          onScanComplete={handlePANScanComplete}
          onCancel={() => setShowPANScanner(false)}
        />
      )}
    </div>
  );
}

export default LoanChat;

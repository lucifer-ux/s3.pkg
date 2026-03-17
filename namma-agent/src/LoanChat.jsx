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
  ChevronLeft,
  ChevronUp,
  ChevronRight,
  Banknote,
  MessageCircle,
  Zap
} from 'lucide-react';
import PANScanner from './PANScanner';
import './LoanChat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getLoanOffers = (productPrice = 50000) => {
  const amount = productPrice;
  
  return [
    {
      id: 'hdfc',
      lender: 'HDFC Bank',
      type: '0% EMI',
      amount: amount,
      interestRate: '10.5%',
      tenureMonths: 12,
      monthlyEMI: Math.round(amount / 12),
      processingFee: Math.round(amount * 0.005),
      interest: 0,
      features: ['Instant approval', 'Zero foreclosure charges'],
      logo: 'HDFC',
      color: '#1e3a8a',
      isBestOffer: true,
    },
    {
      id: 'bajaj',
      lender: 'Bajaj Finserv',
      type: 'No Cost EMI',
      amount: amount,
      interestRate: '0%',
      tenureMonths: 6,
      monthlyEMI: Math.round(amount / 6),
      processingFee: 0,
      interest: 0,
      features: ['No cost EMI', 'Zero down payment'],
      logo: 'BAJAJ',
      color: '#0369a1',
      isBestOffer: false,
    },
    {
      id: 'idfc',
      lender: 'IDFC First Bank',
      type: 'Low Interest EMI',
      amount: amount,
      interestRate: '7.5%',
      tenureMonths: 9,
      monthlyEMI: Math.round((amount * 1.075) / 9),
      processingFee: Math.round(amount * 0.005),
      interest: Math.round(amount * 0.075),
      features: ['Low interest rate', 'No documentation'],
      logo: 'IDFC',
      color: '#c2410c',
      isBestOffer: false,
    },
  ];
};

const LOAN_OFFERS = getLoanOffers();

function LoanChat({ product, onBackToShopping, orderId: initialOrderId }) {
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
  const [showOffersOverlay, setShowOffersOverlay] = useState(false);
  const [expandedOffer, setExpandedOffer] = useState('hdfc');
  const [selectedTenure, setSelectedTenure] = useState(6);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const hasWelcomeMessageAdded = useRef(false);

  // State for tracking backend IDs
  const [orderId, setOrderId] = useState(initialOrderId || null);
  const [userId, setUserId] = useState(null);
  const [packetId, setPacketId] = useState(null);
  const [loanId, setLoanId] = useState(null);
  const [creditLine, setCreditLine] = useState(null);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [tempPhoneNumber, setTempPhoneNumber] = useState('');

  useEffect(() => {
    if (!hasWelcomeMessageAdded.current) {
      hasWelcomeMessageAdded.current = true;
      const welcomeMessage = product 
        ? `Hi! I see you're interested in financing the ${product.name} priced at $${product.price}. I'm here to help you get a loan quickly. Let's start - please enter your 10-digit mobile number.`
        : "Hi! I'm your AI loan assistant. I'll help you get a personal loan in just a few minutes. Let's start - please enter your 10-digit mobile number.";
      
      addMessage(welcomeMessage, 'assistant', { showPhoneInput: true });
    }
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

    const submittedPhone = inputValue;
    setTempPhoneNumber(submittedPhone);
    addMessage(submittedPhone, 'user');
    setInputValue('');
    setIsLoading(true);

    console.log('[LoanChat] Checking if user exists with mobile:', submittedPhone);

    try {
      /* Check if user exists */
      const checkResponse = await fetch(`${API_URL}/api/loan/user/mobile/${submittedPhone}`);
      const checkData = await checkResponse.json();
      console.log('[LoanChat] User check response:', checkData);

      if (checkData.exists) {
        /* Returning user */
        setIsReturningUser(true);
        setUserId(checkData.userId);
        setCreditLine(checkData.data.creditLine);
        addMessage(`Welcome back! We've sent an OTP to +91 ${submittedPhone}. Please enter it to continue.`, 'assistant', { showOTPInput: true });
      } else {
        /* New user */
        setIsReturningUser(false);
        addMessage(`We've sent an OTP to +91 ${submittedPhone}.`, 'assistant', { showOTPInput: true });
      }
      setShowOTPInput(true);
      setCurrentStep('otp');
    } catch (error) {
      console.error('[LoanChat] Error checking user:', error);
      addMessage('Sorry, there was an error. Please try again.', 'assistant');
    }

    setIsLoading(false);
  };

  const handleOTPSubmit = async () => {
    if (otpValue !== '123456') {
      addMessage('Invalid OTP.', 'assistant', { showOTPInput: true });
      return;
    }

    addMessage(otpValue, 'user');
    setOtpValue('');
    setIsLoading(true);

    console.log('[LoanChat] Verifying OTP for:', tempPhoneNumber);

    try {
      const verifyResponse = await fetch(`${API_URL}/api/loan/user/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: tempPhoneNumber,
          otp: '123456',
        }),
      });

      const verifyData = await verifyResponse.json();
      console.log('[LoanChat] OTP verification response:', verifyData);

      if (verifyData.verified) {
        setPhoneNumber(tempPhoneNumber);
        
        if (verifyData.isNewUser) {
          /* Create new user */
          const createResponse = await fetch(`${API_URL}/api/loan/user/create-or-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mobileNumber: tempPhoneNumber,
              orderId: orderId,
            }),
          });

          const createData = await createResponse.json();
          if (createData.success) {
            setUserId(createData.userId);
            addMessage('OTP verified! Now I need your PAN details to fetch the best offers for you.', 'assistant', { showPANOptions: true });
            setCurrentStep('pan');
          }
        } else {
          /* Returning user with stored details */
          setUserId(verifyData.userId);
          setCreditLine(verifyData.data.creditLine);
          setPanData(verifyData.data.panData);
          
          if (verifyData.data.creditLine && verifyData.data.creditLine.available > 0) {
            const userDetails = verifyData.data.panData;
            const availableCredit = verifyData.data.creditLine.available;
            
            if (availableCredit >= (product?.price || 0)) {
              addMessage(
                `Welcome back, ${userDetails?.name?.split(' ')[0] || 'Customer'}! 👋\n\n` +
                `Available Credit: ₹${availableCredit.toLocaleString()}\n` +
                `Product Price: ₹${(product?.price || 0).toLocaleString()}\n\n` +
                `You can complete this purchase instantly with your credit line.`,
                'assistant',
                { showOneStepCheckout: true }
              );
              setCurrentStep('one_step_checkout');
            } else {
              addMessage(
                `Welcome back! Your available credit (₹${availableCredit.toLocaleString()}) ` +
                `is less than the product price (₹${(product?.price || 0).toLocaleString()}). ` +
                `Please update your KYC to increase your credit limit.`,
                'assistant',
                { showPANOptions: true }
              );
              setCurrentStep('pan');
            }
          } else {
            addMessage('Welcome back! Please complete your KYC to activate your credit line.', 'assistant', { showPANOptions: true });
            setCurrentStep('pan');
          }
        }
      }
    } catch (error) {
      console.error('[LoanChat] OTP verification error:', error);
      addMessage('Verification failed. Please try again.', 'assistant', { showOTPInput: true });
    }

    setIsLoading(false);
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

    console.log('[LoanChat] Calling /api/loan/user/update-pan with PAN data:', { panNumber: data.panNumber, name: data.name, userId });

    try {
      const panResponse = await fetch(`${API_URL}/api/loan/user/update-pan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          orderId: orderId,
          panData: {
            panNumber: data.panNumber,
            name: data.name,
            fatherName: data.fatherName,
            dateOfBirth: data.dateOfBirth,
          },
        }),
      });

      const panResult = await panResponse.json();
      console.log('[LoanChat] PAN update response:', panResult);

      if (panResult.success && panResult.userId) {
        setUserId(panResult.userId);
      }
    } catch (error) {
      console.error('[LoanChat] Failed to update PAN data:', error);
    }

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

      console.log('[LoanChat] Calling /api/loan/offers/create-packet with userId:', userId);

      try {
        const packetResponse = await fetch(`${API_URL}/api/loan/offers/create-packet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userId,
            orderId: orderId,
            offers: LOAN_OFFERS,
          }),
        });

        const packetResult = await packetResponse.json();
        console.log('[LoanChat] Create packet response:', packetResult);

        if (packetResult.success && packetResult.packetId) {
          setPacketId(packetResult.packetId);
        }
      } catch (error) {
        console.error('[LoanChat] Failed to create offer packet:', error);
      }

      const offersMessage = await callLLM(
        'Show me my loan offers based on my credit profile',
        { step: 'fetching_offers', cibilScore: 785 }
      );

      addMessage(
        offersMessage || `Excellent news! Your CIBIL score is 785, which qualifies you for premium loan offers. Here are your personalized offers:`,
        'assistant',
        { showOffers: true }
      );
      setShowOffersOverlay(true);
      setCurrentStep('offers');
    }, 3000);
  };

  const handleOfferSelect = async (offer) => {
    setSelectedOffer(offer);
    setShowOffersOverlay(false);
    addMessage(`I'm interested in the ${offer.lender} offer`, 'user');
    setIsLoading(true);

    console.log('[LoanChat] Calling /api/loan/offers/select with offer:', { offerId: offer.id, packetId, userId });

    try {
      const selectResponse = await fetch(`${API_URL}/api/loan/offers/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packetId: packetId,
          userId: userId,
          offerId: offer.id,
          lender: offer.lender,
          amount: offer.amount,
          interestRate: offer.interestRate,
          tenureMonths: offer.tenureMonths,
        }),
      });

      const selectResult = await selectResponse.json();
      console.log('[LoanChat] Select offer response:', selectResult);
    } catch (error) {
      console.error('[LoanChat] Failed to record selected offer:', error);
    }

    const llmResponse = await callLLM(
      `I'm interested in the ${offer.lender} loan offer of ${formatCurrency(offer.amount)}`,
      { step: 'offer_selected', offer }
    );

    setIsLoading(false);

    if (llmResponse) {
      addMessage(llmResponse, 'assistant', { showOfferDetails: true, offer });
    } else {
      addMessage(
        `Perfect choice! The ${offer.lender} loan offers you ${formatCurrency(offer.amount)} at ${offer.interestRate} interest rate with an EMI of ${formatCurrency(offer.monthlyEMI)}/month for ${offer.tenureMonths} months.

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
Processing Fee: ${formatCurrency(selectedOffer.processingFee || 2500)}
Loan Amount: ${formatCurrency(selectedOffer.amount)}
Tenure: ${selectedOffer.tenureMonths} months
EMI: ${formatCurrency(selectedOffer.monthlyEMI)}/month

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
    setShowOffersOverlay(true);
  };

  const handleConfirm = async () => {
    addMessage("Yes, let's proceed with the application", 'user');
    setIsLoading(true);

    console.log('[LoanChat] Calling /api/loan/create with:', { userId, packetId, orderId, selectedOffer: selectedOffer?.id });

    try {
      const loanResponse = await fetch(`${API_URL}/api/loan/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          packetId: packetId,
          orderId: orderId,
          offerId: selectedOffer?.id,
          lender: selectedOffer?.lender,
          amount: selectedOffer?.amount,
          interestRate: selectedOffer?.interestRate,
          tenureMonths: selectedOffer?.tenureMonths,
        }),
      });

      const loanResult = await loanResponse.json();
      console.log('[LoanChat] Create loan response:', loanResult);

      if (loanResult.success && loanResult.loanId) {
        setLoanId(loanResult.loanId);
      }
    } catch (error) {
      console.error('[LoanChat] Failed to create loan:', error);
    }

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

  const handleConfirmDetails = async () => {
    addMessage('Details confirmed', 'user');
    setIsLoading(true);
    
    console.log('[LoanChat] Using credit line for payment:', { userId, orderId, amount: product?.price });
    
    try {
      const paymentResponse = await fetch(`${API_URL}/api/loan/user/use-credit-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          orderId: orderId,
          amount: product?.price || 0,
        }),
      });

      const paymentResult = await paymentResponse.json();
      console.log('[LoanChat] Credit line payment response:', paymentResult);

      if (paymentResult.success) {
        setCreditLine(paymentResult.creditLine);
        addMessage(
          `Payment successful! ₹${(product?.price || 0).toLocaleString()} has been deducted from your credit line. Remaining balance: ₹${paymentResult.creditLine.available.toLocaleString()}. Your order is confirmed!`,
          'assistant',
          { showSuccess: true }
        );
        setCurrentStep('success');
      } else {
        addMessage(`Payment failed: ${paymentResult.error || 'Insufficient credit line'}`, 'assistant');
      }
    } catch (error) {
      console.error('[LoanChat] Credit line payment error:', error);
      addMessage('Payment failed. Please try again.', 'assistant');
    }
    
    setIsLoading(false);
  };

  const handleCreditLinePayment = async () => {
    addMessage('Pay with credit line', 'user');
    setIsLoading(true);
    
    try {
      const paymentResponse = await fetch(`${API_URL}/api/loan/user/use-credit-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          orderId: orderId,
          amount: product?.price || 0,
        }),
      });

      const paymentResult = await paymentResponse.json();
      
      if (paymentResult.success) {
        setCreditLine(paymentResult.creditLine);
        addMessage(
          `Payment successful! ₹${(product?.price || 0).toLocaleString()} deducted from your credit line. Remaining: ₹${paymentResult.creditLine.available.toLocaleString()}`,
          'assistant',
          { showSuccess: true }
        );
        setCurrentStep('success');
      } else {
        addMessage(`Payment failed: ${paymentResult.error}`, 'assistant');
      }
    } catch (error) {
      console.error('[LoanChat] Payment error:', error);
      addMessage('Payment failed. Please try again.', 'assistant');
    }
    
    setIsLoading(false);
  };

  const handleQuickPay = async (amount) => {
    addMessage(`Quick pay ₹${amount.toLocaleString()}`, 'user');
    setIsLoading(true);
    
    console.log('[LoanChat] Quick pay with credit line:', { userId, orderId, amount });
    
    try {
      const paymentResponse = await fetch(`${API_URL}/api/loan/user/use-credit-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          orderId: orderId,
          amount: amount,
        }),
      });

      const paymentResult = await paymentResponse.json();
      console.log('[LoanChat] Quick pay response:', paymentResult);
      
      if (paymentResult.success) {
        setCreditLine(paymentResult.creditLine);
        addMessage(
          `Payment successful! ⚡\n\n` +
          `Amount: ₹${amount.toLocaleString()}\n` +
          `Remaining Credit: ₹${paymentResult.creditLine.available.toLocaleString()}\n\n` +
          `Your order has been placed successfully!`,
          'assistant',
          { showSuccess: true }
        );
        setCurrentStep('success');
      } else {
        addMessage(`Payment failed: ${paymentResult.error}. Please try again or update your KYC.`, 'assistant');
      }
    } catch (error) {
      console.error('[LoanChat] Quick pay error:', error);
      addMessage('Payment failed. Please try again.', 'assistant');
    }
    
    setIsLoading(false);
  };

  const handleExpandOffer = (offerId) => {
    setExpandedOffer(expandedOffer === offerId ? null : offerId);
  };

  const handleAskAIQuestion = async () => {
    if (!aiQuestion.trim()) return;
    
    const question = aiQuestion;
    setAiQuestion('');
    setAiChatHistory(prev => [...prev, { type: 'user', text: question }]);
    
    setIsLoading(true);
    
    const llmResponse = await callLLM(question, { 
      step: 'asking_about_offers',
      productName: product?.name,
      productPrice: product?.price,
      productId: product?.id,
      userCreditScore: 785,
      userProfile: userProfile,
      allOffers: LOAN_OFFERS.map(offer => ({
        id: offer.id,
        lender: offer.lender,
        type: offer.type,
        amount: offer.amount,
        interestRate: offer.interestRate,
        tenureMonths: offer.tenureMonths,
        monthlyEMI: offer.monthlyEMI,
        processingFee: offer.processingFee,
        totalInterest: offer.interest,
        features: offer.features,
        isBestOffer: offer.isBestOffer,
      })),
      selectedOfferId: expandedOffer,
      offerComparisonContext: LOAN_OFFERS.map(o => `${o.lender}: ${o.type} at ${o.interestRate}, EMI ₹${o.monthlyEMI}/mo for ${o.tenureMonths} months`).join('; '),
    });
    
    setIsLoading(false);
    
    setAiChatHistory(prev => [...prev, { 
      type: 'assistant', 
      text: llmResponse || `I can help you with that! Based on your question about "${question}", here are some key points to consider:

1. Each offer has different interest rates and tenures
2. HDFC Bank offers the highest loan amount at competitive rates
3. Bajaj Finserv provides 0% interest for shorter terms
4. IDFC First Bank has the lowest interest rate overall

Would you like me to explain any specific offer in more detail?` 
    }]);
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

  const calculateTotalPayable = (offer) => {
    const principal = offer.amount;
    const interest = offer.interest || 0;
    const processingFee = offer.processingFee || 0;
    return principal + interest + processingFee;
  };

  const calculateEMI = (offer, tenure) => {
    const monthlyRate = (parseFloat(offer.interestRate) || 0) / 100 / 12;
    const months = tenure;
    const principal = offer.amount;
    
    if (monthlyRate === 0) {
      return Math.round(principal / months);
    }
    
    const emi = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / 
                (Math.pow(1 + monthlyRate, months) - 1);
    return Math.round(emi);
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
                
                {message.showPhoneInput && currentStep === 'phone' && message.id === messages[messages.length - 1]?.id && (
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

                {message.showPANOptions && currentStep === 'pan' && message.id === messages[messages.length - 1]?.id && (
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

                {message.showPANInput && currentStep === 'pan' && message.id === messages[messages.length - 1]?.id && (
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

                {message.showOffers && currentStep === 'offers' && !showOffersOverlay && (
                  <div className="quick-replies">
                    <button className="quick-reply primary" onClick={() => setShowOffersOverlay(true)}>
                      <Sparkles size={16} />
                      View My Loan Offers
                    </button>
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

                {message.showOTPInput && currentStep === 'otp' && message.id === messages[messages.length - 1]?.id && (
                  <div className="chat-input-wrapper">
                    <input
                      type="text"
                      placeholder="Enter OTP (123456)"
                      value={otpValue}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtpValue(val);
                      }}
                      maxLength={6}
                    />
                    <button 
                      className="send-btn"
                      onClick={handleOTPSubmit}
                      disabled={otpValue.length !== 6}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                )}

                {message.showCreditLinePayment && currentStep === 'payment' && message.id === messages[messages.length - 1]?.id && (
                  <div className="quick-replies">
                    <button className="quick-reply primary" onClick={handleCreditLinePayment}>
                      <Wallet size={16} />
                      Pay with Credit Line (₹{creditLine?.available?.toLocaleString()} available)
                    </button>
                  </div>
                )}

                {message.showConfirmDetails && currentStep === 'confirm_details' && message.id === messages[messages.length - 1]?.id && (
                  <div className="quick-replies">
                    <button className="quick-reply primary" onClick={handleConfirmDetails}>
                      <CheckCircle size={16} />
                      Confirm & Pay with Credit Line
                    </button>
                    <button className="quick-reply" onClick={() => {
                      addMessage('I need to update my details', 'user');
                      addMessage('No problem! Let\'s update your PAN details.', 'assistant', { showPANOptions: true });
                      setCurrentStep('pan');
                    }}>
                      <RefreshCw size={16} />
                      Update Details
                    </button>
                  </div>
                )}

                {message.showOneStepCheckout && currentStep === 'one_step_checkout' && message.id === messages[messages.length - 1]?.id && (
                  <div className="quick-replies">
                    <button className="quick-reply primary" onClick={() => handleQuickPay(product?.price || 0)}>
                      <Zap size={16} />
                      Quick Pay ₹{(product?.price || 0).toLocaleString()}
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

        {isLoading && !showOffersOverlay && (
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

      {/* Loan Offers Overlay - PaymentOptions Style */}
      {showOffersOverlay && (
        <div className="loan-offers-overlay">
          <div className="loan-offers-container">
            {/* Header */}
            <div className="loan-offers-header">
              <button className="loan-offers-back-btn" onClick={() => setShowOffersOverlay(false)}>
                <ChevronLeft size={24} />
              </button>
              <h2 className="loan-offers-title">Your Loan Offers</h2>
              <div className="header-spacer"></div>
            </div>

            <p className="loan-offers-subtitle">
              CIBIL Score: <span className="cibil-score">{userProfile?.cibilScore || 785}</span> — Excellent!
            </p>

            {/* Scrollable Content */}
            <div className="loan-offers-content">
              {/* Personal Loan Section */}
              <div className="payment-section">
                <div className="section-header">
                  <Banknote size={20} />
                  <span>PERSONAL LOAN OFFERS</span>
                </div>

                {/* Best Offer First */}
                {LOAN_OFFERS.sort((a, b) => (b.isBestOffer ? 1 : 0) - (a.isBestOffer ? 1 : 0)).map((offer) => {
                  const isExpanded = expandedOffer === offer.id;
                  const currentEMI = isExpanded ? calculateEMI(offer, selectedTenure) : offer.monthlyEMI;
                  
                  return (
                    <div 
                      key={offer.id} 
                      className={`emi-card ${isExpanded ? 'expanded' : ''} ${offer.isBestOffer ? 'best-offer' : ''}`}
                    >
                      {/* Card Header */}
                      <div className="emi-card-header" onClick={() => handleExpandOffer(offer.id)}>
                        <div className="bank-logo" style={{ backgroundColor: offer.color }}>
                          {offer.logo}
                        </div>
                        <div className="emi-info">
                          <h3 className="emi-title">{offer.lender} — {offer.type} · {offer.tenureMonths} months</h3>
                          <p className="emi-amount">{formatCurrency(currentEMI)}/mo</p>
                        </div>
                        {isExpanded ? <ChevronUp size={24} className="expand-icon" /> : <ChevronRight size={24} className="expand-icon" />}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="emi-details">
                          {/* Tenure Selector */}
                          <div className="tenure-selector">
                            {[3, 6, 9, 12].map((months) => (
                              <button
                                key={months}
                                className={`tenure-btn ${selectedTenure === months ? 'active' : ''}`}
                                onClick={() => setSelectedTenure(months)}
                              >
                                {months}M
                              </button>
                            ))}
                          </div>

                          {/* Breakdown */}
                          <div className="breakdown">
                            <div className="breakdown-row">
                              <span>Loan Amount</span>
                              <span>{formatCurrency(offer.amount)}</span>
                            </div>
                            <div className="breakdown-row">
                              <span>Interest Rate</span>
                              <span className={offer.interestRate === '0%' ? 'zero-interest' : ''}>{offer.interestRate}</span>
                            </div>
                            <div className="breakdown-row">
                              <span>Processing Fee</span>
                              <span>{formatCurrency(offer.processingFee || 0)}</span>
                            </div>
                            <div className="breakdown-row">
                              <span>Interest Charges</span>
                              <span className="zero-interest">{formatCurrency(offer.interest || 0)}</span>
                            </div>
                            <div className="breakdown-row total">
                              <span>Total Payable</span>
                              <span>{formatCurrency(calculateTotalPayable(offer))}</span>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="offer-features">
                            {offer.features.map((feature, idx) => (
                              <span key={idx} className="feature-tag">
                                <CheckCircle size={12} />
                                {feature}
                              </span>
                            ))}
                          </div>

                          {/* Proceed Button */}
                          <button 
                            className="proceed-offer-btn"
                            onClick={() => handleOfferSelect(offer)}
                          >
                            Proceed with {offer.lender}
                          </button>

                          {/* AI Powered */}
                          <div className="ai-powered">
                            <button className="explain-link" onClick={() => {
                              setAiQuestion(`Explain the ${offer.lender} offer`);
                            }}>
                              Explain this offer
                            </button>
                            <span className="ai-badge">
                              <Sparkles size={12} />
                              POWERED BY AI
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Chat History */}
              {aiChatHistory.length > 0 && (
                <div className="ai-chat-section">
                  <div className="section-header">
                    <MessageCircle size={20} />
                    <span>AI ASSISTANT</span>
                  </div>
                  <div className="ai-chat-messages">
                    {aiChatHistory.map((msg, idx) => (
                      <div key={idx} className={`ai-chat-message ${msg.type}`}>
                        {msg.type === 'assistant' && <Bot size={14} className="ai-chat-icon" />}
                        <p>{msg.text}</p>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="ai-chat-message assistant loading">
                        <div className="loading-dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ask AI Input */}
            <div className="ask-ai-container">
              <div className="ask-ai-input-wrapper">
                <MessageCircle size={20} className="ask-ai-icon" />
                <input
                  type="text"
                  placeholder="Ask AI about these offers..."
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskAIQuestion()}
                />
                <button 
                  className="ask-ai-send-btn"
                  onClick={handleAskAIQuestion}
                  disabled={!aiQuestion.trim() || isLoading}
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="ask-ai-hint">Try: "Which offer has lowest interest?" or "Explain HDFC offer"</p>
            </div>
          </div>
        </div>
      )}

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

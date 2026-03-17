import { useState, useEffect } from 'react';
import { 
  Smartphone, 
  CreditCard, 
  Loader2, 
  CheckCircle, 
  ChevronLeft, 
  Shield, 
  FileText,
  Sparkles,
  User,
  Wallet,
  Calendar,
  Percent,
  ArrowRight,
  Lock,
  Info
} from 'lucide-react';
import PANScanner from './PANScanner';
import './LoanFlow.css';

const STEPS = {
  PHONE_ENTRY: 'phone_entry',
  PAN_SCANNER: 'pan_scanner',
  BUREAU_FETCH: 'bureau_fetch',
  LOAN_OFFERS: 'loan_offers',
  OFFER_DETAIL: 'offer_detail',
  KYC_SETUP: 'kyc_setup',
  SUCCESS: 'success'
};

const DUMMY_BUREAU_DATA = {
  cibilScore: 785,
  creditHistory: 'Excellent',
  activeAccounts: 3,
  totalCreditLimit: 250000,
  creditUtilization: '12%',
  recentEnquiries: 0,
  accountAge: '4 years 8 months'
};

const LOAN_CATEGORIES = [
  { id: 'personal', name: 'Personal Loan', icon: Wallet, color: '#5b4fcf' },
  { id: 'consumer', name: 'Consumer Durable', icon: Smartphone, color: '#10b981' },
  { id: 'credit_card', name: 'Credit Card', icon: CreditCard, color: '#f59e0b' },
];

const LOAN_OFFERS = [
  {
    id: 1,
    category: 'personal',
    lender: 'HDFC Bank',
    lenderLogo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/HDFC_Bank_Logo.svg',
    amount: 500000,
    interestRate: '10.5%',
    tenure: '12 months',
    emi: 43958,
    processingFee: '2,500',
    features: ['Instant approval', 'Zero foreclosure charges', 'Flexible repayment'],
    eligibility: 'Pre-approved based on your CIBIL score'
  },
  {
    id: 2,
    category: 'consumer',
    lender: 'Bajaj Finserv',
    lenderLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Bajaj_Finserv_Logo.svg',
    amount: 200000,
    interestRate: '0%',
    tenure: '6 months',
    emi: 33333,
    processingFee: '1,999',
    features: ['No cost EMI', 'Zero down payment', 'Instant disbursal'],
    eligibility: 'Available for purchases above 15,000'
  },
  {
    id: 3,
    category: 'consumer',
    lender: 'IDFC First Bank',
    lenderLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/IDFC_First_Bank_logo.svg',
    amount: 300000,
    interestRate: '7.5%',
    tenure: '9 months',
    emi: 34722,
    processingFee: '1,500',
    features: ['Low interest rate', 'No documentation', 'Digital process'],
    eligibility: 'Pre-approved offer'
  },
  {
    id: 4,
    category: 'credit_card',
    lender: 'Axis Bank',
    lenderLogo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Axis_Bank_logo.svg',
    cardName: 'Flipkart Axis Bank Credit Card',
    creditLimit: 150000,
    joiningFee: '500',
    annualFee: '500 (waived on 2L spends)',
    features: ['5% cashback on Flipkart', '4 complimentary lounge visits', '1% fuel surcharge waiver'],
    eligibility: 'Instant approval for CIBIL >750'
  },
  {
    id: 5,
    category: 'credit_card',
    lender: 'ICICI Bank',
    lenderLogo: 'https://upload.wikimedia.org/wikipedia/commons/1/12/ICICI_Bank_Logo.svg',
    cardName: 'Amazon Pay ICICI Card',
    creditLimit: 100000,
    joiningFee: 'Free',
    annualFee: 'Lifetime free',
    features: ['5% rewards on Amazon', '1% on other spends', 'No cost EMI options'],
    eligibility: 'Available for select customers'
  }
];

function LoanFlow({ product, onBackToShopping, onBackToPurchase }) {
  const [currentStep, setCurrentStep] = useState(STEPS.PHONE_ENTRY);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [panData, setPanData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [kycProgress, setKycProgress] = useState(0);
  const [applicationId] = useState(() => `LN${Math.random().toString(36).substr(2, 8).toUpperCase()}`);
  const [showPANScanner, setShowPANScanner] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handlePhoneSubmit = () => {
    if (phoneNumber.length === 10) {
      setCurrentStep(STEPS.PAN_SCANNER);
    }
  };

  const handlePanScanComplete = (data) => {
    setPanData(data);
    setCurrentStep(STEPS.BUREAU_FETCH);
  };

  useEffect(() => {
    if (currentStep === STEPS.BUREAU_FETCH) {
      const timer = setTimeout(() => {
        setUserProfile({
          name: panData?.name || 'Rahul Sharma',
          age: 28,
          gender: 'Male',
          phone: phoneNumber,
          pan: panData?.panNumber || 'ABCDE1234F',
          ...DUMMY_BUREAU_DATA
        });
        setCurrentStep(STEPS.LOAN_OFFERS);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, phoneNumber, panData]);

  useEffect(() => {
    if (currentStep === STEPS.KYC_SETUP) {
      const interval = setInterval(() => {
        setKycProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setCurrentStep(STEPS.SUCCESS), 500);
            return 100;
          }
          return prev + 10;
        });
      }, 400);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  const filteredOffers = selectedCategory === 'all' 
    ? LOAN_OFFERS 
    : LOAN_OFFERS.filter(offer => offer.category === selectedCategory);

  const renderPhoneEntry = () => (
    <div className="loan-step-container">
      <div className="loan-header">
        <button className="back-button" onClick={onBackToPurchase || onBackToShopping}>
          <ChevronLeft size={24} />
        </button>
        <h2>Apply for Loan</h2>
        <div className="placeholder-right" />
      </div>

      {product && (
        <div className="product-context-banner">
          <div className="product-context-info">
            <span className="product-context-label">Financing</span>
            <span className="product-context-name">{product.name}</span>
            <span className="product-context-price">${product?.price || 999}.00</span>
          </div>
        </div>
      )}

      <div className="loan-content">
        <div className="step-indicator">
          <div className="step active">1</div>
          <div className="step-line" />
          <div className="step">2</div>
          <div className="step-line" />
          <div className="step">3</div>
        </div>

        <div className="phone-entry-section">
          <div className="phone-icon-wrapper">
            <Smartphone size={48} className="phone-icon" />
          </div>
          
          <h3 className="section-title">Enter Mobile Number</h3>
          <p className="section-subtitle">
            We will send an OTP to verify your number
          </p>

          <div className="phone-input-wrapper">
            <span className="country-code">+91</span>
            <input
              type="tel"
              className="phone-input"
              placeholder="Enter 10-digit number"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setPhoneNumber(value);
              }}
              maxLength={10}
            />
          </div>

          <button
            className={`primary-button ${phoneNumber.length === 10 ? 'active' : ''}`}
            onClick={handlePhoneSubmit}
            disabled={phoneNumber.length !== 10}
          >
            Continue
            <ArrowRight size={20} />
          </button>

          <div className="security-note">
            <Shield size={16} />
            <span>Your data is secure and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (currentStep === STEPS.PAN_SCANNER && showPANScanner) {
    return (
      <PANScanner
        onScanComplete={(data) => {
          setShowPANScanner(false);
          handlePanScanComplete(data);
        }}
        onCancel={() => setShowPANScanner(false)}
      />
    );
  }

  const renderPanScanner = () => (
    <div className="loan-step-container">
      <div className="loan-header">
        <button className="back-button" onClick={() => setCurrentStep(STEPS.PHONE_ENTRY)}>
          <ChevronLeft size={24} />
        </button>
        <h2>Scan PAN Card</h2>
        <div className="placeholder-right" />
      </div>

      <div className="loan-content">
        <div className="step-indicator">
          <div className="step completed">
            <CheckCircle size={16} />
          </div>
          <div className="step-line active" />
          <div className="step active">2</div>
          <div className="step-line" />
          <div className="step">3</div>
        </div>

        <div className="pan-scan-section">
          <div className="scan-frame">
            <CreditCard size={48} className="pan-icon" />
            <div className="scan-corners">
              <div className="corner top-left" />
              <div className="corner top-right" />
              <div className="corner bottom-left" />
              <div className="corner bottom-right" />
            </div>
          </div>

          <h3 className="section-title">Scan Your PAN Card</h3>
          <p className="section-subtitle">
            Position your PAN card within the frame. We will extract your details using AI.
          </p>

          <button
            className="primary-button active"
            onClick={() => setShowPANScanner(true)}
          >
            Open Camera
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderBureauFetch = () => (
    <div className="loan-step-container">
      <div className="loan-content centered">
        <div className="bureau-fetch-section">
          <div className="fetch-animation">
            <div className="pulse-ring" />
            <div className="pulse-ring delay-1" />
            <div className="pulse-ring delay-2" />
            <Loader2 size={48} className="fetch-icon" />
          </div>

          <h3 className="section-title">Fetching Your Credit Profile</h3>
          <p className="section-subtitle">
            We are retrieving your bureau data to find the best offers for you
          </p>

          <div className="fetch-status">
            <div className="status-item completed">
              <CheckCircle size={16} />
              <span>Identity verified</span>
            </div>
            <div className="status-item active">
              <Loader2 size={16} className="spin" />
              <span>Fetching CIBIL score</span>
            </div>
            <div className="status-item">
              <div className="status-dot" />
              <span>Checking eligibility</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoanOffers = () => (
    <div className="loan-step-container">
      <div className="loan-header">
        <button className="back-button" onClick={() => setCurrentStep(STEPS.PAN_SCANNER)}>
          <ChevronLeft size={24} />
        </button>
        <h2>Your Loan Offers</h2>
        <div className="placeholder-right" />
      </div>

      <div className="loan-content">
        <div className="step-indicator">
          <div className="step completed">
            <CheckCircle size={16} />
          </div>
          <div className="step-line active" />
          <div className="step completed">
            <CheckCircle size={16} />
          </div>
          <div className="step-line active" />
          <div className="step active">3</div>
        </div>

        <div className="bureau-summary">
          <div className="cibil-score-card">
            <div className="score-circle">
              <span className="score-value">{userProfile?.cibilScore}</span>
              <span className="score-label">CIBIL</span>
            </div>
            <div className="score-details">
              <span className="score-status">{userProfile?.creditHistory}</span>
              <span className="score-subtext">Credit Score</span>
            </div>
          </div>
        </div>

        <div className="category-tabs">
          <button
            className={`category-tab ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All Offers
          </button>
          {LOAN_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`category-tab ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <cat.icon size={16} />
              {cat.name}
            </button>
          ))}
        </div>

        <div className="offers-list">
          {filteredOffers.map(offer => (
            <div
              key={offer.id}
              className="offer-card"
              onClick={() => {
                setSelectedOffer(offer);
                setCurrentStep(STEPS.OFFER_DETAIL);
              }}
            >
              <div className="offer-header">
                <div className="lender-info">
                  <div className="lender-logo-placeholder">
                    {offer.lender.charAt(0)}
                  </div>
                  <div className="lender-details">
                    <span className="lender-name">{offer.lender}</span>
                    <span className="offer-type">
                      {offer.category === 'credit_card' ? offer.cardName : offer.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <ArrowRight size={20} className="offer-arrow" />
              </div>

              <div className="offer-highlights">
                {offer.category === 'credit_card' ? (
                  <>
                    <div className="highlight">
                      <span className="highlight-value">{formatCurrency(offer.creditLimit)}</span>
                      <span className="highlight-label">Credit Limit</span>
                    </div>
                    <div className="highlight">
                      <span className="highlight-value">{offer.annualFee}</span>
                      <span className="highlight-label">Annual Fee</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="highlight">
                      <span className="highlight-value">{formatCurrency(offer.amount)}</span>
                      <span className="highlight-label">Loan Amount</span>
                    </div>
                    <div className="highlight">
                      <span className="highlight-value">{offer.interestRate}</span>
                      <span className="highlight-label">Interest</span>
                    </div>
                    <div className="highlight">
                      <span className="highlight-value">{offer.emi?.toLocaleString()}</span>
                      <span className="highlight-label">EMI/mo</span>
                    </div>
                  </>
                )}
              </div>

              {offer.eligibility && (
                <div className="eligibility-badge">
                  <Sparkles size={12} />
                  {offer.eligibility}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOfferDetail = () => (
    <div className="loan-step-container">
      <div className="loan-header">
        <button className="back-button" onClick={() => setCurrentStep(STEPS.LOAN_OFFERS)}>
          <ChevronLeft size={24} />
        </button>
        <h2>Offer Details</h2>
        <div className="placeholder-right" />
      </div>

      <div className="loan-content">
        {selectedOffer && (
          <div className="offer-detail-card">
            {product && (
              <div className="product-purchase-context">
                <div className="purchase-context-header">
                  <span className="purchase-context-label">Purchase</span>
                </div>
                <div className="purchase-context-details">
                  <span className="purchase-context-name">{product.name}</span>
                  <span className="purchase-context-price">${product?.price || 999}.00</span>
                </div>
              </div>
            )}

            <div className="offer-detail-header">
              <div className="lender-logo-placeholder large">
                {selectedOffer.lender.charAt(0)}
              </div>
              <div className="offer-detail-title">
                <h3>{selectedOffer.lender}</h3>
                <p>{selectedOffer.category === 'credit_card' ? selectedOffer.cardName : selectedOffer.category.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="offer-amount-section">
              {selectedOffer.category === 'credit_card' ? (
                <>
                  <span className="amount-value">{formatCurrency(selectedOffer.creditLimit)}</span>
                  <span className="amount-label">Credit Limit</span>
                </>
              ) : (
                <>
                  <span className="amount-value">{formatCurrency(selectedOffer.amount)}</span>
                  <span className="amount-label">Loan Amount</span>
                </>
              )}
            </div>

            <div className="offer-details-grid">
              {selectedOffer.category === 'credit_card' ? (
                <>
                  <div className="detail-item">
                    <Calendar size={20} />
                    <div>
                      <span className="detail-label">Joining Fee</span>
                      <span className="detail-value">{selectedOffer.joiningFee}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Percent size={20} />
                    <div>
                      <span className="detail-label">Annual Fee</span>
                      <span className="detail-value">{selectedOffer.annualFee}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="detail-item">
                    <Percent size={20} />
                    <div>
                      <span className="detail-label">Interest Rate</span>
                      <span className="detail-value">{selectedOffer.interestRate} p.a.</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Calendar size={20} />
                    <div>
                      <span className="detail-label">Tenure</span>
                      <span className="detail-value">{selectedOffer.tenure}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Wallet size={20} />
                    <div>
                      <span className="detail-label">EMI</span>
                      <span className="detail-value">{selectedOffer.emi?.toLocaleString()}/month</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <FileText size={20} />
                    <div>
                      <span className="detail-label">Processing Fee</span>
                      <span className="detail-value">{selectedOffer.processingFee}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="ai-explanation detailed">
              <div className="ai-header">
                <Sparkles size={16} />
                <span>AI Recommendation</span>
              </div>
              <div className="ai-content">
                <p className="ai-main-text">
                  Based on your excellent CIBIL score of {userProfile?.cibilScore}, {selectedOffer.lender} is offering you a {selectedOffer.category === 'credit_card' ? 'credit card' : 'loan'} with exceptional terms.
                </p>
                <div className="ai-reasoning">
                  <h5>Why this is perfect for you:</h5>
                  <ul>
                    <li>
                      <strong>Best Rate:</strong> At {selectedOffer.category === 'credit_card' ? selectedOffer.annualFee : selectedOffer.interestRate}, 
                      this is among the {selectedOffer.category === 'credit_card' ? 'lowest fee cards' : 'lowest rates'} available for your profile
                    </li>
                    <li>
                      <strong>Eligibility:</strong> {selectedOffer.eligibility}
                    </li>
                    <li>
                      <strong>Credit Profile Match:</strong> Your {userProfile?.creditHistory} history qualifies you for premium benefits
                    </li>
                    {product && (
                      <li>
                        <strong>Purchase Coverage:</strong> {selectedOffer.category === 'credit_card' 
                          ? `Credit limit of ${formatCurrency(selectedOffer.creditLimit)} easily covers your ${product.name} purchase of $${product?.price || 999}`
                          : `Loan amount of ${formatCurrency(selectedOffer.amount)} is perfect for your purchase of $${product?.price || 999} with flexible EMI options`
                        }
                      </li>
                    )}
                  </ul>
                </div>
                <div className="ai-savings">
                  <span className="savings-label">Your Savings</span>
                  <span className="savings-value">
                    {selectedOffer.category === 'credit_card' 
                      ? 'Up to 5% cashback on all purchases'
                      : `Save up to ${formatCurrency(Math.round(selectedOffer.amount * 0.02))} compared to market rates`
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="offer-features detailed">
              <h4>Key Benefits</h4>
              <div className="features-grid">
                {selectedOffer.features.map((feature, idx) => (
                  <div key={idx} className="feature-item">
                    <CheckCircle size={18} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="offer-timeline">
              <h4>Disbursal Timeline</h4>
              <div className="timeline-steps">
                <div className="timeline-step completed">
                  <div className="timeline-dot" />
                  <span>Application</span>
                </div>
                <div className="timeline-step active">
                  <div className="timeline-dot" />
                  <span>Verification</span>
                </div>
                <div className="timeline-step">
                  <div className="timeline-dot" />
                  <span>Approval</span>
                </div>
                <div className="timeline-step">
                  <div className="timeline-dot" />
                  <span>Disbursal</span>
                </div>
              </div>
              <p className="timeline-note">Money in your account within 24 hours of approval</p>
            </div>

            <button
              className="primary-button active large"
              onClick={() => setCurrentStep(STEPS.KYC_SETUP)}
            >
              Apply Now
              <ArrowRight size={20} />
            </button>

            <div className="terms-note">
              <Info size={14} />
              <span>By applying, you agree to the lender&apos;s terms and conditions</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderKYCSetup = () => (
    <div className="loan-step-container">
      <div className="loan-header">
        <button className="back-button" onClick={() => setCurrentStep(STEPS.OFFER_DETAIL)}>
          <ChevronLeft size={24} />
        </button>
        <h2>Complete KYC</h2>
        <div className="placeholder-right" />
      </div>

      <div className="loan-content">
        <div className="kyc-section">
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${kycProgress}%` }}
              />
            </div>
            <span className="progress-text">{kycProgress}% Complete</span>
          </div>

          <div className="kyc-steps">
            <div className={`kyc-step ${kycProgress >= 20 ? 'completed' : 'active'}`}>
              <div className="kyc-step-icon">
                {kycProgress >= 20 ? <CheckCircle size={20} /> : <Lock size={20} />}
              </div>
              <div className="kyc-step-content">
                <span className="kyc-step-title">eKYC Verification</span>
                <span className="kyc-step-status">
                  {kycProgress >= 20 ? 'Verified' : 'Verifying...'}
                </span>
              </div>
            </div>

            <div className={`kyc-step ${kycProgress >= 50 ? 'completed' : kycProgress >= 20 ? 'active' : ''}`}>
              <div className="kyc-step-icon">
                {kycProgress >= 50 ? <CheckCircle size={20} /> : <FileText size={20} />}
              </div>
              <div className="kyc-step-content">
                <span className="kyc-step-title">Document Upload</span>
                <span className="kyc-step-status">
                  {kycProgress >= 50 ? 'Completed' : kycProgress >= 20 ? 'Uploading...' : 'Pending'}
                </span>
              </div>
            </div>

            <div className={`kyc-step ${kycProgress >= 80 ? 'completed' : kycProgress >= 50 ? 'active' : ''}`}>
              <div className="kyc-step-icon">
                {kycProgress >= 80 ? <CheckCircle size={20} /> : <Shield size={20} />}
              </div>
              <div className="kyc-step-content">
                <span className="kyc-step-title">Mandate Setup</span>
                <span className="kyc-step-status">
                  {kycProgress >= 80 ? 'Setup Complete' : kycProgress >= 50 ? 'Setting up...' : 'Pending'}
                </span>
              </div>
            </div>

            <div className={`kyc-step ${kycProgress >= 100 ? 'completed' : kycProgress >= 80 ? 'active' : ''}`}>
              <div className="kyc-step-icon">
                {kycProgress >= 100 ? <CheckCircle size={20} /> : <Wallet size={20} />}
              </div>
              <div className="kyc-step-content">
                <span className="kyc-step-title">Loan Disbursal</span>
                <span className="kyc-step-status">
                  {kycProgress >= 100 ? 'Disbursed' : kycProgress >= 80 ? 'Processing...' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          <div className="kyc-info">
            <Shield size={16} />
            <span>All processes are RBI compliant and secure</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="loan-step-container">
      <div className="loan-content centered">
        <div className="success-section">
          <div className="success-animation">
            <div className="success-circle">
              <CheckCircle size={64} className="success-icon" />
            </div>
            <div className="success-confetti">
              <span></span><span></span><span></span>
              <span></span><span></span><span></span>
            </div>
          </div>

          <h3 className="success-title">Application Submitted!</h3>
          <p className="success-subtitle">
            Your loan application has been approved and the amount will be disbursed shortly.
          </p>

          <div className="success-details">
            <div className="success-item">
              <span className="success-label">Application ID</span>
              <span className="success-value">{applicationId}</span>
            </div>
            <div className="success-item">
              <span className="success-label">Status</span>
              <span className="success-value approved">Approved</span>
            </div>
          </div>

          <button
            className="primary-button active"
            onClick={onBackToShopping}
          >
            Back to Shopping
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case STEPS.PHONE_ENTRY:
        return renderPhoneEntry();
      case STEPS.PAN_SCANNER:
        return renderPanScanner();
      case STEPS.BUREAU_FETCH:
        return renderBureauFetch();
      case STEPS.LOAN_OFFERS:
        return renderLoanOffers();
      case STEPS.OFFER_DETAIL:
        return renderOfferDetail();
      case STEPS.KYC_SETUP:
        return renderKYCSetup();
      case STEPS.SUCCESS:
        return renderSuccess();
      default:
        return renderPhoneEntry();
    }
  };

  return (
    <div className="loan-flow-container">
      {renderCurrentStep()}
    </div>
  );
}

export default LoanFlow;

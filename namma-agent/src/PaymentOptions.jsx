import { useState } from 'react';
import { ChevronLeft, CreditCard, ChevronUp, ChevronRight, Sparkles, Banknote } from 'lucide-react';
import './PaymentOptions.css';

const emiOffers = [
  {
    id: 'hdfc',
    bank: 'HDFC',
    type: '0% EMI',
    tenureMonths: 6,
    monthlyEMI: 20817,
    mrpValue: 134900,
    instantDiscount: 10000,
    processingFee: 199,
    interest: 0,
    totalPayable: 124900,
    logo: 'HDFC',
    color: '#1e3a8a',
    isBestOffer: true,
  },
  {
    id: 'icici',
    bank: 'ICICI',
    type: 'Low Interest EMI',
    tenureMonths: 12,
    monthlyEMI: 11500,
    mrpValue: 134900,
    instantDiscount: 0,
    processingFee: 0,
    interest: 5000,
    totalPayable: 143000,
    logo: 'ICICI',
    color: '#c2410c',
    isBestOffer: false,
  },
];

const loanOffers = [
  {
    id: 'bajaj',
    lender: 'Bajaj Finserv',
    type: 'No Cost EMI',
    monthlyEMI: 15612,
    logo: 'BAJAJ FINSERV',
    color: '#0369a1',
  },
];

function PaymentOptions({ product, onBack, onProceed }) {
  const [expandedOffer, setExpandedOffer] = useState('hdfc');
  const [selectedTenure, setSelectedTenure] = useState(6);

  const handleExpand = (offerId) => {
    setExpandedOffer(expandedOffer === offerId ? null : offerId);
  };

  const formatCurrency = (amount) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  const bestOffer = emiOffers.find(o => o.isBestOffer) || emiOffers[0];

  return (
    <div className="payment-overlay">
      <div className="payment-container">
        {/* Header */}
        <div className="payment-header">
          <button className="payment-back-btn" onClick={onBack}>
            <ChevronLeft size={24} />
          </button>
          <h2 className="payment-title">Pay in easy instalments</h2>
          <div className="header-spacer"></div>
        </div>

        <p className="payment-subtitle">Select an offer that fits your budget</p>

        {/* Scrollable Content */}
        <div className="payment-content">
          {/* Credit Card EMI Section */}
          <div className="payment-section">
            <div className="section-header">
              <CreditCard size={20} />
              <span>CREDIT CARD EMI</span>
            </div>

            {/* Best Offer First */}
            {emiOffers.sort((a, b) => (b.isBestOffer ? 1 : 0) - (a.isBestOffer ? 1 : 0)).map((offer) => {
              const isExpanded = expandedOffer === offer.id;
              
              return (
                <div 
                  key={offer.id} 
                  className={`emi-card ${isExpanded ? 'expanded' : ''} ${offer.isBestOffer ? 'best-offer' : ''}`}
                >
                  {/* Card Header */}
                  <div className="emi-card-header" onClick={() => handleExpand(offer.id)}>
                    <div className="bank-logo" style={{ backgroundColor: offer.color }}>
                      {offer.logo}
                    </div>
                    <div className="emi-info">
                      <h3 className="emi-title">{offer.bank} — {offer.type} · {offer.tenureMonths} months</h3>
                      <p className="emi-amount">{formatCurrency(offer.monthlyEMI)}/mo</p>
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
                          <span>MRP Value</span>
                          <span>{formatCurrency(offer.mrpValue)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Instant Discount</span>
                          <span className="discount">-{formatCurrency(offer.instantDiscount)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Processing Fee</span>
                          <span>{formatCurrency(offer.processingFee)}</span>
                        </div>
                        <div className="breakdown-row">
                          <span>Interest (0%)</span>
                          <span className="zero-interest">{formatCurrency(offer.interest)}</span>
                        </div>
                        <div className="breakdown-row total">
                          <span>Total Payable</span>
                          <span>{formatCurrency(offer.totalPayable)}</span>
                        </div>
                      </div>

                      {/* Proceed Button */}
                      <button 
                        className="proceed-offer-btn"
                        onClick={() => onProceed?.(offer)}
                      >
                        Proceed with offer
                      </button>

                      {/* AI Powered */}
                      <div className="ai-powered">
                        <button className="explain-link">Explain this offer</button>
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

          {/* Loan/No-Cost EMI Section */}
          <div className="payment-section">
            <div className="section-header">
              <Banknote size={20} />
              <span>LOAN / NO-COST EMI</span>
            </div>

            {loanOffers.map((offer) => (
              <div key={offer.id} className="emi-card loan-card">
                <div className="emi-card-header">
                  <div className="bank-logo" style={{ backgroundColor: offer.color }}>
                    {offer.logo}
                  </div>
                  <div className="emi-info">
                    <h3 className="emi-title">{offer.lender} — {offer.type}</h3>
                    <p className="emi-amount">{formatCurrency(offer.monthlyEMI)}/mo</p>
                  </div>
                  <ChevronRight size={24} className="expand-icon" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentOptions;
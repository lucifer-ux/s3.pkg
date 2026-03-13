import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoan } from '../context/LoanContext';
import {
  PartyPopper,
  CheckCircle,
  Mail,
  Clock,
  FileText,
  RotateCcw,
  Home,
  Download,
  Headphones,
  Share2,
  Sparkles,
  Shield,
  Zap,
  Wallet,
  Calendar,
  Percent,
  ArrowRight,
  Copy,
  Check,
  MessageCircle,
  Star,
  BadgeCheck,
  TrendingUp,
  Users
} from 'lucide-react';

const COLORS = ['#aa3bff', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const ConfettiParticle = ({ color, delay, x, y, duration }) => (
  <div
    className="absolute w-3 h-3 rounded-full animate-confetti"
    style={{
      backgroundColor: color,
      left: `${x}%`,
      top: `${y}%`,
      animationDelay: `${delay}ms`,
      animationDuration: `${duration}ms`,
    }}
  />
);

const Confetti = () => {
  const seed = useMemo(() => Date.now(), []);
  
  const particles = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(seededRandom(seed + i) * COLORS.length)],
      delay: seededRandom(seed + i + 100) * 1500,
      x: seededRandom(seed + i + 200) * 100,
      y: -10 - seededRandom(seed + i + 300) * 20,
      duration: 2000 + seededRandom(seed + i + 400) * 1000,
    }));
  }, [seed]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map(particle => (
        <ConfettiParticle key={particle.id} {...particle} />
      ))}
    </div>
  );
};

const AnimatedCheckmark = () => {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-xl opacity-60 animate-pulse" />
      <div className="absolute inset-2 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full blur-lg opacity-40 animate-pulse" style={{ animationDelay: '0.2s' }} />
      
      <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50">
        <svg
          className="w-16 h-16 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-checkmark"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      
      <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
      <Sparkles className="absolute -bottom-1 -left-1 w-5 h-5 text-yellow-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
      <Star className="absolute -top-1 -left-3 w-4 h-4 text-amber-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
    </div>
  );
};

const SoundIndicator = () => {
  const [bars, setBars] = useState([0, 0, 0, 0, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 100));
    }, 100);
    
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setBars([100, 100, 100, 100, 100]);
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="flex items-center gap-1 h-6">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full transition-all duration-100"
          style={{ height: `${Math.max(height, 20)}%` }}
        />
      ))}
    </div>
  );
};

const InfoRow = ({ icon: IconComponent, label, value, highlight = false, copyable = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (copyable && value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${highlight ? 'bg-gradient-to-br from-indigo-100 to-purple-100' : 'bg-gray-50'}`}>
          <IconComponent className={`w-4 h-4 ${highlight ? 'text-purple-600' : 'text-gray-500'}`} />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${highlight ? 'text-purple-700' : 'text-gray-900'}`}>
          {value}
        </span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const ProgressStep = ({ icon: IconComponent, label, status, delay }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30';
      case 'current':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 animate-pulse';
      case 'pending':
        return 'bg-gray-100 text-gray-400';
      default:
        return 'bg-gray-100 text-gray-400';
    }
  };

  return (
    <div 
      className="flex items-center gap-3 animate-in fade-in slide-in-from-left"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusStyles()}`}>
        <IconComponent className="w-5 h-5" />
      </div>
      <span className={`text-sm font-medium ${status === 'completed' ? 'text-green-700' : status === 'current' ? 'text-purple-700' : 'text-gray-400'}`}>
        {label}
      </span>
      {status === 'completed' && (
        <BadgeCheck className="w-5 h-5 text-green-500 animate-in zoom-in" />
      )}
    </div>
  );
};

const TrustBadge = ({ icon: IconComponent, text, subtext }) => (
  <div className="flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-100">
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
      <IconComponent className="w-5 h-5 text-purple-600" />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-900">{text}</p>
      <p className="text-xs text-gray-500">{subtext}</p>
    </div>
  </div>
);

const ShareButton = ({ icon: IconComponent, label, onClick, color }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${color} hover:shadow-lg active:scale-95`}
  >
    <IconComponent className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

const LoanSuccess = () => {
  const navigate = useNavigate();
  const { loanData, resetLoanData } = useLoan();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [emiAmount, setEmiAmount] = useState(0);

  const [referenceNumber] = useState(() => {
    const prefix = 'QL';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  });

  const expectedDisbursalDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toLocaleDateString('en-IN', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  }, []);

  useEffect(() => {
    const offer = loanData.selectedOffer;
    if (offer) {
      const amount = offer.maxAmount || offer.creditLimit || offer.preApprovedLimit || 100000;
      const rate = offer.interestRate || 12;
      const tenure = offer.tenure || 12;

      if (rate === 0) {
        setEmiAmount(Math.round(amount / tenure));
      } else {
        const monthlyRate = rate / 12 / 100;
        const emi = amount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / 
                    (Math.pow(1 + monthlyRate, tenure) - 1);
        setEmiAmount(Math.round(emi));
      }
    }

    const timer1 = setTimeout(() => setShowConfetti(true), 100);
    const timer2 = setTimeout(() => setShowCheckmark(true), 200);
    const timer3 = setTimeout(() => setShowConfetti(false), 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [loanData.selectedOffer]);

  const handleBackToHome = () => {
    resetLoanData();
    navigate('/');
  };

  const handleDownloadSummary = () => {
    const summaryData = {
      referenceNumber,
      loanType: loanData.selectedOffer?.name || 'Personal Loan',
      amount: loanData.selectedOffer?.maxAmount || 100000,
      interestRate: loanData.selectedOffer?.interestRate || 12,
      tenure: loanData.selectedOffer?.tenure || 12,
      emi: emiAmount,
      date: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(summaryData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `loan-summary-${referenceNumber}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleContactSupport = () => {
    window.location.href = 'tel:1800-123-4567';
  };

  const offer = loanData.selectedOffer || {};
  const loanAmount = offer.maxAmount || offer.creditLimit || offer.preApprovedLimit || 100000;
  const interestRate = offer.interestRate || 12;
  const tenure = offer.tenure || 12;

  const progressSteps = [
    { icon: FileText, label: 'Application Submitted', status: 'completed' },
    { icon: Shield, label: 'KYC Verified', status: 'completed' },
    { icon: CheckCircle, label: 'Offer Approved', status: 'completed' },
    { icon: Wallet, label: 'Disbursement', status: 'current' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-32">
      {showConfetti && <Confetti />}

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-pink-200/40 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-green-400/50 rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-purple-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      <header className="relative z-10 px-6 pt-8 pb-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100">
            <PartyPopper className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-sm font-medium text-[#6b6375]">Success</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 max-w-lg mx-auto">
        <div className="text-center mb-8">
          {showCheckmark && (
            <div className="flex justify-center mb-6 animate-in zoom-in duration-500">
              <AnimatedCheckmark />
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-[#08060d] mb-2 animate-in fade-in slide-in-from-top-2" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            Congratulations!
          </h1>
          
          <p className="text-lg text-gray-600 mb-4 animate-in fade-in" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
            Your loan has been approved
          </p>
          
          <div className="flex items-center justify-center gap-2 animate-in fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
            <SoundIndicator />
            <span className="text-sm text-green-600 font-medium">Success confirmed</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/30 mb-6 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Application Reference</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(referenceNumber)}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-2xl font-bold tracking-wider font-mono">{referenceNumber}</p>
          <p className="text-xs opacity-80 mt-1">Save this for future reference</p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-6 mb-6 animate-in fade-in slide-in-from-bottom-3" style={{ animationDelay: '600ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#08060d]">Loan Summary</h2>
              <p className="text-sm text-gray-500">{offer.name || 'Personal Loan'}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 text-center mb-5 border border-purple-100">
            <p className="text-sm text-gray-500 mb-1">Approved Loan Amount</p>
            <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ₹{loanAmount.toLocaleString()}
            </p>
          </div>

          <div className="space-y-1">
            <InfoRow icon={Percent} label="Interest Rate" value={`${interestRate}% p.a.`} />
            <InfoRow icon={Calendar} label="Tenure" value={`${tenure} months`} />
            <InfoRow icon={Wallet} label="Monthly EMI" value={`₹${emiAmount.toLocaleString()}`} highlight />
            <InfoRow 
              icon={FileText} 
              label="Processing Fee" 
              value={`₹${(offer.processingFee || 0).toLocaleString()}`} 
            />
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-6 mb-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '700ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-[#08060d]">Next Steps</h2>
          </div>

          <div className="space-y-4">
            {progressSteps.map((step, index) => (
              <ProgressStep 
                key={step.label} 
                {...step} 
                delay={800 + index * 100}
              />
            ))}
          </div>

          <div className="mt-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Expected Disbursal</p>
                <p className="text-sm text-amber-700">Within 24 hours to your registered bank account</p>
                <p className="text-xs text-amber-600 mt-1">{expectedDisbursalDate}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100 mb-6 animate-in fade-in" style={{ animationDelay: '1000ms', animationFillMode: 'both' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800 mb-1">Confirmation Sent</h3>
              <p className="text-sm text-green-700">
                We&apos;ve sent the loan approval details to your registered mobile number and email address.
              </p>
              <p className="text-xs text-green-600 mt-2">
                SMS sent to: ••••••{loanData.phoneNumber?.slice(-4) || '9999'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6 animate-in fade-in" style={{ animationDelay: '1100ms', animationFillMode: 'both' }}>
          <TrustBadge 
            icon={Shield} 
            text="RBI Approved"
            subtext="Regulated lender"
          />
          <TrustBadge 
            icon={Users} 
            text="10M+ Customers"
            subtext="Trust us"
          />
          <TrustBadge 
            icon={Zap} 
            text="Instant Approval"
            subtext="AI-powered"
          />
          <TrustBadge 
            icon={BadgeCheck} 
            text="256-bit SSL"
            subtext="Bank-grade security"
          />
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-5 border border-purple-100/50 mb-6 animate-in fade-in" style={{ animationDelay: '1200ms', animationFillMode: 'both' }}>
          <p className="text-sm font-semibold text-gray-700 mb-3">Share your success</p>
          <div className="flex flex-wrap gap-2">
            <ShareButton 
              icon={Share2} 
              label="WhatsApp" 
              color="bg-green-500 text-white hover:bg-green-600"
              onClick={() => window.open(`https://wa.me/?text=I just got approved for a loan of ₹${loanAmount.toLocaleString()}! Check it out.`, '_blank')}
            />
            <ShareButton 
              icon={MessageCircle} 
              label="SMS" 
              color="bg-blue-500 text-white hover:bg-blue-600"
              onClick={() => window.open(`sms:?body=I just got approved for a loan!`, '_blank')}
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100 mb-6 animate-in fade-in" style={{ animationDelay: '1300ms', animationFillMode: 'both' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <Headphones className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#08060d]">Need Help?</h3>
                <p className="text-sm text-gray-500">Our support team is available 24/7</p>
              </div>
            </div>
            <button
              onClick={handleContactSupport}
              className="px-4 py-2 bg-white text-purple-600 rounded-xl font-medium text-sm shadow-sm hover:shadow-md transition-all"
            >
              Call Now
            </button>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-purple-100/50 z-40">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleDownloadSummary}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-50 to-purple-50 text-purple-700 border border-purple-200 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span>Download Summary</span>
            </button>
            
            <button
              onClick={handleContactSupport}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm bg-gray-50 text-gray-700 border border-gray-200 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Headphones className="w-4 h-4" />
              <span>Support</span>
            </button>
          </div>

          <button
            onClick={handleBackToHome}
            className="w-full group flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-base bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <Home className="w-5 h-5" />
            <span>Back to Home</span>
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <button
            onClick={handleBackToHome}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start a new application</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.5);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti linear forwards;
        }

        @keyframes checkmark {
          0% {
            stroke-dasharray: 0, 100;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            stroke-dasharray: 100, 0;
            opacity: 1;
          }
        }

        .animate-checkmark {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: checkmark 0.8s ease-out forwards;
        }

        .animate-in {
          animation-duration: 0.5s;
          animation-fill-mode: both;
        }

        .fade-in {
          animation-name: fadeIn;
        }

        .slide-in-from-left {
          animation-name: slideInLeft;
        }

        .slide-in-from-top-2 {
          animation-name: slideInTop;
        }

        .slide-in-from-bottom-2 {
          animation-name: slideInBottom2;
        }

        .slide-in-from-bottom-3 {
          animation-name: slideInBottom3;
        }

        .slide-in-from-bottom-4 {
          animation-name: slideInBottom4;
        }

        .zoom-in {
          animation-name: zoomIn;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInTop {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInBottom2 {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInBottom3 {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInBottom4 {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default LoanSuccess;

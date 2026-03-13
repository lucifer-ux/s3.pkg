import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoan } from '../context/LoanContext';
import { fetchBureauData } from '../services/bureauService';
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Wallet,
  Activity,
  CreditCard,
  FileText,
  Loader2,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const BureauCheck = () => {
  const navigate = useNavigate();
  const { loanData, updateLoanData } = useLoan();
  const progressRef = useRef(null);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bureauData, setBureauData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(300);

  const steps = [
    { id: 'connecting', label: 'Connecting to Bureau', icon: Shield, duration: 800 },
    { id: 'fetching', label: 'Fetching Credit Data', icon: FileText, duration: 1000 },
    { id: 'analyzing', label: 'Analyzing History', icon: Activity, duration: 1200 },
    { id: 'complete', label: 'Report Ready', icon: CheckCircle, duration: 500 }
  ];

  const getScoreColor = (score) => {
    if (score < 600) return { bg: '#ef4444', text: '#dc2626', label: 'Poor', gradient: 'from-red-500 to-rose-600' };
    if (score <= 700) return { bg: '#f97316', text: '#ea580c', label: 'Fair', gradient: 'from-orange-500 to-amber-600' };
    if (score <= 750) return { bg: '#eab308', text: '#ca8a04', label: 'Good', gradient: 'from-yellow-500 to-amber-500' };
    return { bg: '#22c55e', text: '#16a34a', label: 'Excellent', gradient: 'from-emerald-500 to-green-600' };
  };

  const getCircleProgress = (score) => {
    const minScore = 300;
    const maxScore = 900;
    const percentage = ((score - minScore) / (maxScore - minScore)) * 100;
    const circumference = 2 * Math.PI * 120;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return { circumference, strokeDashoffset, percentage };
  };

  const animateScore = (targetScore) => {
    const duration = 1500;
    const startTime = Date.now();
    const startScore = 300;

    const updateScore = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentScore = Math.round(startScore + (targetScore - startScore) * easeOutQuart);
      
      setAnimatedScore(currentScore);
      
      if (progress < 1) {
        requestAnimationFrame(updateScore);
      }
    };

    requestAnimationFrame(updateScore);
  };

  const formatCreditHistory = (months) => {
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
      return `${years}y ${remainingMonths}m`;
    }
    return `${months} months`;
  };

  const formatCurrency = (amount) => {
    if (amount === 0) return '₹0';
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  useEffect(() => {
    const simulateBureauCheck = async () => {
      try {
        for (let i = 0; i < steps.length; i++) {
          setCurrentStep(i);
          setProgress(((i + 1) / steps.length) * 100);
          await new Promise(resolve => setTimeout(resolve, steps[i].duration));
        }

        const panNumber = loanData.panNumber || 'ABCDE1234F';
        const result = await fetchBureauData(panNumber);

        if (result.success) {
          setBureauData(result.data);
          updateLoanData('bureauData', result.data);
          setIsLoading(false);
          setShowResults(true);
          
          setTimeout(() => {
            animateScore(result.data.cibilScore);
          }, 300);

          setTimeout(() => {
            navigate('/offers');
          }, 3500);
        } else {
          throw new Error('Failed to fetch bureau data');
        }
      } catch (err) {
        setError('Unable to fetch credit report. Please try again.');
        setIsLoading(false);
      }
    };

    simulateBureauCheck();
  }, [loanData.panNumber, navigate, updateLoanData]);

  const scoreConfig = bureauData ? getScoreColor(bureauData.cibilScore) : getScoreColor(700);
  const circleProgress = getCircleProgress(animatedScore);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-purple-400/40 rounded-full animate-pulse" />
        <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-indigo-400/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/3 right-1/3 w-5 h-5 bg-pink-400/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <header className="relative z-10 px-6 pt-8 pb-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100">
            <Shield className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-sm font-medium text-[#6b6375]">CIBIL Check</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-6 relative z-10">
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step, index) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === 2 
                  ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500' 
                  : index < 2 
                    ? 'w-4 bg-gradient-to-r from-indigo-500 to-purple-500'
                    : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {!showResults ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl blur-xl opacity-50 animate-pulse" />
              <div className="relative w-28 h-28 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-2xl flex items-center justify-center">
                <Shield className="w-14 h-14 text-white" />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-semibold text-[#08060d] mb-2 text-center">
              Checking your{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Credit Score
              </span>
            </h1>
            <p className="text-[#6b6375] text-base text-center max-w-xs mx-auto mb-10">
              We're securely fetching your credit report from CIBIL
            </p>

            <div className="w-full max-w-xs mb-8">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="w-full max-w-xs space-y-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${
                      isActive 
                        ? 'bg-white shadow-lg scale-105' 
                        : isCompleted 
                          ? 'bg-white/60' 
                          : 'bg-white/40 opacity-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                        : isCompleted 
                          ? 'bg-green-500' 
                          : 'bg-gray-200'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <StepIcon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium transition-colors duration-300 ${
                        isActive ? 'text-[#08060d]' : 'text-[#6b6375]'
                      }`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <p className="text-xs text-[#6b6375] mt-0.5">In progress...</p>
                      )}
                    </div>
                    {isActive && (
                      <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-10 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-[#6b6375]">256-bit encrypted connection</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/30 mb-4 animate-in zoom-in duration-500">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-[#08060d] mb-1">
                Credit Report Ready
              </h2>
              <p className="text-[#6b6375] text-sm">
                Redirecting to loan offers...
              </p>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-6 mb-4">
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-64 h-64">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 260 260">
                    <circle
                      cx="130"
                      cy="130"
                      r="120"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                    />
                    <circle
                      cx="130"
                      cy="130"
                      r="120"
                      fill="none"
                      stroke={`url(#gradient-${scoreConfig.label})`}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={circleProgress.circumference}
                      strokeDashoffset={circleProgress.strokeDashoffset}
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id={`gradient-Excellent`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#22c55e" />
                      </linearGradient>
                      <linearGradient id={`gradient-Good`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <linearGradient id={`gradient-Fair`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#ea580c" />
                      </linearGradient>
                      <linearGradient id={`gradient-Poor`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-[#08060d] tabular-nums">
                      {animatedScore}
                    </span>
                    <span className="text-sm text-[#6b6375] mt-1">CIBIL Score</span>
                  </div>
                </div>

                <div 
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${scoreConfig.gradient} text-white font-semibold text-sm shadow-lg animate-in zoom-in duration-500 delay-300`}
                >
                  <Sparkles className="w-4 h-4" />
                  {scoreConfig.label}
                </div>
              </div>

              <div className="flex justify-between text-xs text-[#6b6375] mb-6 px-2">
                <span>300</span>
                <span>600</span>
                <span>750</span>
                <span>900</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden mb-6">
                <div className="flex-1 bg-gradient-to-r from-red-500 to-rose-500" />
                <div className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                <div className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-400" />
                <div className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span className="text-xs text-[#6b6375]">Total Accounts</span>
                  </div>
                  <p className="text-2xl font-bold text-[#08060d]">{bureauData.totalAccounts}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-xs text-[#6b6375]">Active Accounts</span>
                  </div>
                  <p className="text-2xl font-bold text-[#08060d]">{bureauData.activeAccounts}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xs text-[#6b6375]">Credit History</span>
                  </div>
                  <p className="text-2xl font-bold text-[#08060d]">{formatCreditHistory(bureauData.creditHistory)}</p>
                </div>

                <div className={`rounded-2xl p-4 border ${
                  bureauData.overdueAmount > 0 
                    ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100' 
                    : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-100'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      bureauData.overdueAmount > 0 ? 'bg-red-100' : 'bg-green-100'
                    }`}>
                      {bureauData.overdueAmount > 0 ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <span className="text-xs text-[#6b6375]">Overdue</span>
                  </div>
                  <p className={`text-2xl font-bold ${
                    bureauData.overdueAmount > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(bureauData.overdueAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    bureauData.status === 'EXCELLENT' ? 'bg-emerald-100' :
                    bureauData.status === 'GOOD' ? 'bg-green-100' :
                    bureauData.status === 'FAIR' ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    <TrendingUp className={`w-5 h-5 ${
                      bureauData.status === 'EXCELLENT' ? 'text-emerald-600' :
                      bureauData.status === 'GOOD' ? 'text-green-600' :
                      bureauData.status === 'FAIR' ? 'text-amber-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#08060d]">Credit Status</p>
                    <p className="text-xs text-[#6b6375]">Based on your CIBIL report</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  bureauData.status === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-700' :
                  bureauData.status === 'GOOD' ? 'bg-green-100 text-green-700' :
                  bureauData.status === 'FAIR' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {bureauData.status}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-4 text-white shadow-lg shadow-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">View Loan Offers</p>
                    <p className="text-xs text-white/80">Personalized for your score</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-[#08060d] mb-2">Check Failed</h2>
            <p className="text-[#6b6375] text-center mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </main>

      <footer className="px-6 pb-6 pt-4 text-center">
        <p className="text-xs text-[#6b6375]">
          Your credit report is fetched securely via CIBIL
        </p>
      </footer>
    </div>
  );
};

export default BureauCheck;

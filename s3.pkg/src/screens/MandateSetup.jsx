import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoan } from '../context/LoanContext';
import {
  Building2,
  Landmark,
  CheckCircle,
  Shield,
  Lock,
  ArrowRight,
  Search,
  Wallet,
  ChevronLeft,
  BadgeCheck,
  AlertCircle,
  Info,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  CalendarClock,
  FileText,
  ShieldCheck,
  Verified,
  Banknote
} from 'lucide-react';

const POPULAR_BANKS = [
  { id: 'sbi', name: 'State Bank of India', code: 'SBI', color: '#0066B3' },
  { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC', color: '#004C8F' },
  { id: 'icici', name: 'ICICI Bank', code: 'ICICI', color: '#B02A30' },
  { id: 'axis', name: 'Axis Bank', code: 'AXIS', color: '#97144D' },
  { id: 'kotak', name: 'Kotak Mahindra', code: 'KOTAK', color: '#ED1C24' },
  { id: 'pnb', name: 'Punjab National Bank', code: 'PNB', color: '#9A031E' },
  { id: 'canara', name: 'Canara Bank', code: 'CANARA', color: '#00A0B0' },
  { id: 'union', name: 'Union Bank of India', code: 'UBI', color: '#1A237E' },
  { id: 'bob', name: 'Bank of Baroda', code: 'BOB', color: '#FF6600' },
  { id: 'idfc', name: 'IDFC First Bank', code: 'IDFC', color: '#C41230' }
];

const BankLogo = ({ bank, selected = false }) => {
  const initials = bank.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
        selected
          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
          : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600'
      }`}
      style={selected ? {} : { borderLeft: `3px solid ${bank.color}` }}
    >
      {initials}
    </div>
  );
};

const StepIndicator = () => {
  const steps = [
    { label: 'KYC', completed: true },
    { label: 'Mandate', completed: false, active: true },
    { label: 'Complete', completed: false }
  ];

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/50">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            step.completed
              ? 'bg-green-100'
              : step.active
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                : 'bg-gray-100'
          }`}>
            {step.completed ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : step.active ? (
              <Sparkles className="w-4 h-4 text-white" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className={`text-xs font-semibold ${
              step.completed
                ? 'text-green-700'
                : step.active
                  ? 'text-white'
                  : 'text-gray-400'
            }`}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="w-8 h-0.5 mx-2 bg-gray-200">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                style={{ width: step.completed ? '100%' : '0%' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const TrustBadge = ({ icon, text, subtext }) => {
  const Icon = icon;
  return (
  <div className="flex items-center gap-2 px-3 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-purple-100/30">
    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
      <Icon className="w-4 h-4 text-purple-600" />
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-900">{text}</p>
      <p className="text-[10px] text-gray-500">{subtext}</p>
    </div>
  </div>
  );
};

const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  helper,
  icon: Icon,
  maxLength,
  formatValue
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e) => {
    let newValue = e.target.value;
    if (formatValue) {
      newValue = formatValue(newValue);
    }
    onChange(newValue);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#08060d]">{label}</label>
      <div className={`relative transition-all duration-200 ${
        isFocused ? 'scale-[1.02]' : ''
      }`}>
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Icon className={`w-5 h-5 transition-colors ${
              isFocused ? 'text-purple-600' : 'text-gray-400'
            }`} />
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full ${Icon ? 'pl-12' : 'pl-4'} pr-4 py-3.5 bg-white rounded-xl border-2 transition-all duration-200 outline-none ${
            error
              ? 'border-red-300 focus:border-red-500'
              : isFocused
                ? 'border-purple-400 shadow-lg shadow-purple-500/10'
                : 'border-gray-200 hover:border-gray-300'
          }`}
        />
        {error && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>
      {helper && !error && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {helper}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

const AccountTypeToggle = ({ value, onChange }) => (
  <div className="flex gap-3">
    {['Savings', 'Current'].map((type) => (
      <button
        key={type}
        onClick={() => onChange(type)}
        className={`flex-1 py-3.5 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
          value === type
            ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
        }`}
      >
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
          value === type ? 'border-purple-500' : 'border-gray-300'
        }`}>
          {value === type && <div className="w-2 h-2 rounded-full bg-purple-500" />}
        </div>
        <span className="font-medium">{type}</span>
      </button>
    ))}
  </div>
);

const MandateSetup = () => {
  const navigate = useNavigate();
  const { loanData, updateLoanData } = useLoan();

  const [selectedBank, setSelectedBank] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState('Savings');
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [errors, setErrors] = useState({
    accountNumber: '',
    ifscCode: ''
  });

  const filteredBanks = POPULAR_BANKS.filter(
    bank =>
      bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bank.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedBanks = showAllBanks ? filteredBanks : filteredBanks.slice(0, 6);
  const offer = loanData.selectedOffer || {};
  const mandateAmount = offer.maxAmount || offer.creditLimit || offer.preApprovedLimit || 100000;

  const validateAccountNumber = (value) => {
    if (!value) return 'Account number is required';
    const cleanValue = value.replace(/\s/g, '');
    if (cleanValue.length < 9) return 'Account number must be at least 9 digits';
    if (cleanValue.length > 18) return 'Account number must not exceed 18 digits';
    if (!/^\d+$/.test(cleanValue)) return 'Account number must contain only digits';
    return '';
  };

  const validateIFSC = (value) => {
    if (!value) return 'IFSC code is required';
    const cleanValue = value.replace(/\s/g, '').toUpperCase();
    if (cleanValue.length !== 11) return 'IFSC code must be exactly 11 characters';
    if (!/^[A-Z]{4}\d{7}$/.test(cleanValue)) {
      return 'Format: 4 letters + 7 digits (e.g., SBIN0001234)';
    }
    return '';
  };

  const formatAccountNumber = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length > 18) return cleanValue.substring(0, 18);
    return cleanValue;
  };

  const formatIFSC = (value) => {
    const cleanValue = value.replace(/\s/g, '').toUpperCase();
    if (cleanValue.length > 11) return cleanValue.substring(0, 11);
    return cleanValue;
  };

  const handleAccountNumberChange = (value) => {
    const formatted = formatAccountNumber(value);
    setAccountNumber(formatted);
    if (formatted) {
      setErrors(prev => ({ ...prev, accountNumber: validateAccountNumber(formatted) }));
    } else {
      setErrors(prev => ({ ...prev, accountNumber: '' }));
    }
  };

  const handleIFSCChange = (value) => {
    const formatted = formatIFSC(value);
    setIfscCode(formatted);
    if (formatted) {
      setErrors(prev => ({ ...prev, ifscCode: validateIFSC(formatted) }));
    } else {
      setErrors(prev => ({ ...prev, ifscCode: '' }));
    }
  };

  const isFormValid = () => {
    return (
      selectedBank &&
      accountNumber &&
      ifscCode &&
      !errors.accountNumber &&
      !errors.ifscCode &&
      consentChecked
    );
  };

  const handleContinue = () => {
    const accountError = validateAccountNumber(accountNumber);
    const ifscError = validateIFSC(ifscCode);

    if (accountError || ifscError || !selectedBank || !consentChecked) {
      setErrors({
        accountNumber: accountError,
        ifscCode: ifscError
      });
      return;
    }

    updateLoanData('mandateSetup', true);
    updateLoanData('mandateDetails', {
      bank: selectedBank,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      accountType
    });

    navigate('/success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 pb-32">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-purple-100 text-[#6b6375] hover:text-[#08060d] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100">
            <Building2 className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-sm font-medium text-[#6b6375]">Mandate Setup</span>
          </div>
          <div className="w-20" />
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center">
          <StepIndicator currentStep={2} />
        </div>
      </header>

      <main className="relative z-10 px-4 max-w-lg mx-auto space-y-6">
        {/* Security Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-full border border-emerald-100 mb-4">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Secure eNACH Setup</span>
          </div>
          <h1 className="text-2xl font-bold text-[#08060d] mb-2">
            Set Up Auto-Debit
          </h1>
          <p className="text-sm text-[#6b6375]">
            Link your bank account for automatic EMI payments
          </p>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-2">
          <TrustBadge
            icon={ShieldCheck}
            text="NPCI Approved"
            subtext="Verified"
          />
          <TrustBadge
            icon={Lock}
            text="256-bit SSL"
            subtext="Encrypted"
          />
          <TrustBadge
            icon={Verified}
            text="RBI Regulated"
            subtext="Secure"
          />
        </div>

        {/* Mandate Summary Card */}
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Mandate Details</span>
            </div>
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {showSummary ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80 mb-1">Maximum Mandate Amount</p>
              <p className="text-3xl font-bold">₹{mandateAmount.toLocaleString()}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <CircleDollarSign className="w-7 h-7" />
            </div>
          </div>

          {showSummary && (
            <div className="mt-4 pt-4 border-t border-white/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-80">Frequency</span>
                </div>
                <span className="font-semibold">Monthly</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-80">Type</span>
                </div>
                <span className="font-semibold">eNACH</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-80">Loan</span>
                </div>
                <span className="font-semibold">{offer.name || 'Personal Loan'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bank Selection */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#08060d]">Select Your Bank</h2>
              <p className="text-xs text-[#6b6375]">Choose from popular banks</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search banks..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all"
            />
          </div>

          {/* Bank Grid */}
          <div className="grid grid-cols-3 gap-3">
            {displayedBanks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                  selectedBank?.id === bank.id
                    ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg shadow-purple-500/20'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <BankLogo bank={bank} selected={selectedBank?.id === bank.id} />
                  <span className={`text-xs font-medium text-center line-clamp-1 ${
                    selectedBank?.id === bank.id ? 'text-purple-700' : 'text-gray-600'
                  }`}>
                    {bank.code}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Show More/Less */}
          {filteredBanks.length > 6 && (
            <button
              onClick={() => setShowAllBanks(!showAllBanks)}
              className="w-full mt-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              {showAllBanks ? 'Show Less' : `Show All Banks (${filteredBanks.length})`}
              {showAllBanks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Account Details Form */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#08060d]">Account Details</h2>
              <p className="text-xs text-[#6b6375]">Enter your bank account information</p>
            </div>
          </div>

          <div className="space-y-4">
            <InputField
              label="Account Number"
              value={accountNumber}
              onChange={handleAccountNumberChange}
              placeholder="Enter 9-18 digit account number"
              error={errors.accountNumber}
              helper="Between 9 to 18 digits"
              icon={Building2}
              formatValue={formatAccountNumber}
            />

            <InputField
              label="IFSC Code"
              value={ifscCode}
              onChange={handleIFSCChange}
              placeholder="e.g., SBIN0001234"
              error={errors.ifscCode}
              helper="11 characters: 4 letters + 7 digits"
              icon={Landmark}
              maxLength={11}
              formatValue={formatIFSC}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#08060d]">Account Type</label>
              <AccountTypeToggle value={accountType} onChange={setAccountType} />
            </div>
          </div>
        </div>

        {/* Consent Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-[#08060d]">Consent & Authorization</h2>
              <p className="text-xs text-[#6b6375]">Required for eNACH registration</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                  className="peer sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                  consentChecked
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-500'
                    : 'border-gray-300 group-hover:border-purple-400'
                }`}>
                  {consentChecked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
              </div>
              <span className="text-sm text-[#6b6375] leading-relaxed">
                I authorize <span className="font-semibold text-[#08060d]">Lending Partner</span> to debit my bank account
                for monthly EMI payments through eNACH/NPCI. I understand that this mandate can be cancelled by
                contacting my bank or the lending partner.
              </span>
            </label>

            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Important:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>This is a one-time registration for automatic payments</li>
                    <li>You will receive SMS alerts before each debit</li>
                    <li>Maximum amount will be as per your loan EMI</li>
                    <li>Processing time: 24-48 hours</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center pb-4">
          <div className="inline-flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>256-bit encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <BadgeCheck className="w-3 h-3" />
              <span>NPCI verified</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>PCI DSS compliant</span>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Continue Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-purple-100/50 z-40">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Validation Messages */}
          {!isFormValid() && (
            <div className="flex items-center justify-center gap-2 text-xs text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span>
                {!selectedBank
                  ? 'Please select a bank'
                  : !accountNumber || errors.accountNumber
                    ? 'Please enter valid account number'
                    : !ifscCode || errors.ifscCode
                      ? 'Please enter valid IFSC code'
                      : !consentChecked
                        ? 'Please accept the consent'
                        : 'Complete all fields to continue'}
              </span>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!isFormValid()}
            className={`w-full group flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-base transition-all duration-300 ${
              isFormValid()
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Continue to Complete</span>
            <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${
              isFormValid() ? 'group-hover:translate-x-1' : ''
            }`} />
          </button>

          <p className="text-center text-xs text-[#6b6375]">
            By continuing, you agree to the{' '}
            <span className="text-purple-600 font-medium cursor-pointer hover:underline">
              Terms & Conditions
            </span>{' '}
            and{' '}
            <span className="text-purple-600 font-medium cursor-pointer hover:underline">
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MandateSetup;

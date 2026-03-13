import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, ArrowRight, CheckCircle, Shield, Sparkles } from 'lucide-react';
import { useLoan } from '../context/LoanContext';

const PhoneInput = () => {
  const navigate = useNavigate();
  const { updateLoanData } = useLoan();
  const inputRef = useRef(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Format phone number as user types (Indian format)
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits
    const limited = digits.slice(0, 10);
    
    // Format as +91 XXXXX XXXXX
    if (limited.length === 0) return '';
    if (limited.length <= 5) return `+91 ${limited}`;
    return `+91 ${limited.slice(0, 5)} ${limited.slice(5)}`;
  };

  // Handle input change
  const handleChange = (e) => {
    const rawValue = e.target.value;
    const formatted = formatPhoneNumber(rawValue);
    
    setPhoneNumber(formatted);
    setShowError(false);
    
    // Check if valid (10 digits)
    const digitsOnly = formatted.replace(/\D/g, '');
    const valid = digitsOnly.length === 10;
    setIsValid(valid);
    
    if (valid) {
      setIsSuccess(true);
    } else {
      setIsSuccess(false);
    }
  };

  // Handle continue button
  const handleContinue = () => {
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length === 10) {
      // Store in context
      updateLoanData('phoneNumber', digitsOnly);
      
      // Navigate to PAN scan
      navigate('/pan-scan');
    } else {
      setShowError(true);
      inputRef.current?.focus();
    }
  };

  // Handle key press (Enter to continue)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && isValid) {
      handleContinue();
    }
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
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100">
            <Sparkles className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-sm font-medium text-[#6b6375]">Quick Loan</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-6 relative z-10">
        {/* Progress Indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step, index) => (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === 0 
                  ? 'w-8 bg-gradient-to-r from-indigo-500 to-purple-500' 
                  : 'w-4 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl shadow-lg shadow-purple-500/25">
            <Smartphone className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl font-semibold text-[#08060d] mb-3 leading-tight">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              QuickLoan
            </span>
          </h1>
          
          <p className="text-[#6b6375] text-base leading-relaxed max-w-xs mx-auto">
            Enter your mobile number to get started with your instant loan application
          </p>
        </div>

        {/* Input Section */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-6 mb-6">
            {/* Label */}
            <label 
              htmlFor="phone-input"
              className="block text-sm font-medium text-[#6b6375] mb-3"
            >
              Mobile Number
            </label>

            {/* Input Container */}
            <div 
              className={`relative flex items-center bg-gray-50 rounded-2xl border-2 transition-all duration-300 ${
                isSuccess 
                  ? 'border-green-400 bg-green-50/30' 
                  : showError 
                    ? 'border-red-400 bg-red-50/30' 
                    : isFocused 
                      ? 'border-[#aa3bff] bg-white shadow-lg shadow-purple-500/10' 
                      : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Country Code */}
              <div className="flex items-center pl-4 pr-3 py-4 border-r border-gray-200">
                <span className="text-lg font-semibold text-[#08060d]">🇮🇳</span>
              </div>

              {/* Phone Input */}
              <input
                ref={inputRef}
                id="phone-input"
                type="tel"
                value={phoneNumber}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="+91 98765 43210"
                maxLength={16}
                className="flex-1 px-4 py-4 text-xl font-semibold text-[#08060d] bg-transparent border-none outline-none placeholder:text-gray-300"
                style={{ letterSpacing: '0.5px' }}
              />

              {/* Success/Status Icon */}
              <div className="pr-4">
                {isSuccess ? (
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full animate-in fade-in zoom-in duration-300">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full transition-all duration-300 ${
                    phoneNumber.length > 0 ? 'bg-gray-200' : 'bg-gray-100'
                  }`}>
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        phoneNumber.length > 0 ? 'bg-gray-400' : 'bg-gray-300'
                      }`} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {showError && (
              <div className="mt-3 flex items-center gap-2 text-red-500 animate-in slide-in-from-top-1 duration-200">
                <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-xs font-bold">!</span>
                </div>
                <span className="text-sm">Please enter a valid 10-digit mobile number</span>
              </div>
            )}

            {/* Hint */}
            {!showError && !isSuccess && (
              <p className="mt-3 text-sm text-[#6b6375]">
                We'll send an OTP to verify your number
              </p>
            )}

            {/* Success Message */}
            {isSuccess && (
              <p className="mt-3 text-sm text-green-600 font-medium animate-in slide-in-from-top-1 duration-200">
                Looks good! Ready to continue
              </p>
            )}
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <Shield className="w-4 h-4 text-[#aa3bff]" />
              <span className="text-xs font-medium text-[#6b6375]">
                256-bit SSL Secured
              </span>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="pb-8 pt-4">
          <button
            onClick={handleContinue}
            disabled={!isValid}
            className={`w-full group relative flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 ${
              isValid
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            <ArrowRight 
              className={`w-5 h-5 transition-transform duration-300 ${
                isValid ? 'group-hover:translate-x-1' : ''
              }`} 
            />
          </button>

          {/* Terms */}
          <p className="text-center text-xs text-[#6b6375] mt-4 px-4">
            By continuing, you agree to our{' '}
            <a href="#" className="text-[#aa3bff] hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-[#aa3bff] hover:underline">Privacy Policy</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default PhoneInput;

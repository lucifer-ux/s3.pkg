import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoan } from '../context/LoanContext';
import {
  User,
  MapPin,
  Calendar,
  FileText,
  Upload,
  CheckCircle,
  ArrowRight,
  Shield,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Building2,
} from 'lucide-react';

const KYCSetup = () => {
  const navigate = useNavigate();
  const { loanData, updateLoanData } = useLoan();

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    address: '',
    pinCode: '',
    city: '',
    state: '',
    aadhaarNumber: '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  const panNumber = loanData.panNumber || 'ABCDE1234F';

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName': {
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Name can only contain letters and spaces';
        return '';
      }
      case 'dateOfBirth': {
        if (!value) return 'Date of birth is required';
        const dob = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 18) return 'You must be at least 18 years old';
        if (age > 80) return 'Maximum age limit is 80 years';
        return '';
      }
      case 'address': {
        if (!value.trim()) return 'Address is required';
        if (value.trim().length < 10) return 'Please enter a complete address';
        return '';
      }
      case 'pinCode': {
        if (!value) return 'PIN code is required';
        if (!/^\d{6}$/.test(value)) return 'PIN code must be 6 digits';
        return '';
      }
      case 'city': {
        if (!value.trim()) return 'City is required';
        return '';
      }
      case 'state': {
        if (!value.trim()) return 'State is required';
        return '';
      }
      case 'aadhaarNumber': {
        if (!value) return 'Aadhaar number is required';
        if (!/^\d{12}$/.test(value.replace(/\s/g, ''))) return 'Aadhaar must be 12 digits';
        return '';
      }
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'aadhaarNumber') {
      const digits = value.replace(/\D/g, '').slice(0, 12);
      formattedValue = digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    }

    if (name === 'pinCode') {
      formattedValue = value.replace(/\D/g, '').slice(0, 6);
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    if (touched[name]) {
      const error = validateField(name, formattedValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const isFormValid = () => {
    const requiredFields = ['fullName', 'dateOfBirth', 'address', 'pinCode', 'city', 'state', 'aadhaarNumber'];
    const hasErrors = requiredFields.some(field => {
      const error = validateField(field, formData[field]);
      return error !== '';
    });
    const allFilled = requiredFields.every(field => formData[field].trim() !== '');
    return !hasErrors && allFilled && consentGiven;
  };

  const handleSubmit = async () => {
    const newErrors = {};
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setErrors(newErrors);
    setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    if (Object.keys(newErrors).length === 0 && consentGiven) {
      setIsLoading(true);

      await new Promise(resolve => setTimeout(resolve, 1500));

      updateLoanData('kycData', {
        ...formData,
        panNumber,
        kycCompleted: true,
        completedAt: new Date().toISOString(),
      });
      updateLoanData('kycCompleted', true);

      setIsLoading(false);
      setShowSuccess(true);

      setTimeout(() => {
        navigate('/mandate-setup');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-200/30 rounded-full blur-3xl" />
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 mx-4 max-w-sm w-full text-center animate-in zoom-in duration-300">
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            <h3 className="text-2xl font-bold text-[#08060d] mb-2">KYC Verified!</h3>
            <p className="text-[#6b6375]">Your identity has been verified successfully</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#6b6375]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Redirecting to mandate setup...</span>
            </div>
          </div>
        </div>
      )}

      <header className="relative z-10 px-4 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-purple-100 text-[#6b6375] hover:text-[#08060d] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-purple-100">
            <Shield className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-sm font-medium text-[#6b6375]">KYC Setup</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="flex-1 flex flex-col px-4 relative z-10 max-w-lg mx-auto w-full pb-32">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg shadow-purple-500/30">
                1
              </div>
              <span className="text-sm font-medium text-[#08060d]">KYC</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-3" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm font-semibold">
                2
              </div>
              <span className="text-sm font-medium text-[#6b6375]">Mandate</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 mx-3" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm font-semibold">
                3
              </div>
              <span className="text-sm font-medium text-[#6b6375]">Complete</span>
            </div>
          </div>

          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500" />
          </div>
          <p className="text-xs text-[#6b6375] mt-2 text-center">Step 1 of 3: Complete your KYC</p>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-purple-500/25">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-[#08060d] mb-2">
            Complete Your{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              KYC
            </span>
          </h1>
          <p className="text-[#6b6375] text-sm max-w-xs mx-auto">
            Please verify your details and complete the required information
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#08060d] mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#aa3bff]" />
            Document Verification
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50/80 rounded-2xl border border-green-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#08060d]">PAN Card</p>
                <p className="text-xs text-[#6b6375] font-mono">{panNumber}</p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Verified
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50/80 rounded-2xl border border-green-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#08060d]">Photo</p>
                <p className="text-xs text-[#6b6375]">
                  {loanData.age && `${loanData.age} years, ${loanData.gender}`}
                </p>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Verified
              </span>
            </div>

            <div className="flex items-center gap-3 p-3 bg-amber-50/80 rounded-2xl border border-amber-100">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Upload className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#08060d]">Aadhaar Card</p>
                <p className="text-xs text-[#6b6375]">Enter details below</p>
              </div>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                Pending
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#08060d] mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#aa3bff]" />
            Personal Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6375] mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your full name"
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl text-[#08060d] placeholder:text-gray-400 focus:outline-none transition-all ${
                    errors.fullName && touched.fullName
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-gray-200 focus:border-[#aa3bff] focus:bg-white'
                  }`}
                />
                {formData.fullName && !errors.fullName && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.fullName && touched.fullName && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.fullName}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6375] mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl text-[#08060d] focus:outline-none transition-all ${
                    errors.dateOfBirth && touched.dateOfBirth
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-gray-200 focus:border-[#aa3bff] focus:bg-white'
                  }`}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.dateOfBirth && touched.dateOfBirth && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.dateOfBirth}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6375] mb-2">
                Aadhaar Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="1234 5678 9012"
                  maxLength={14}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl text-[#08060d] placeholder:text-gray-400 focus:outline-none transition-all font-mono tracking-wider ${
                    errors.aadhaarNumber && touched.aadhaarNumber
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-gray-200 focus:border-[#aa3bff] focus:bg-white'
                  }`}
                />
                {formData.aadhaarNumber.replace(/\s/g, '').length === 12 && !errors.aadhaarNumber && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                {errors.aadhaarNumber && touched.aadhaarNumber ? (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.aadhaarNumber}
                  </p>
                ) : (
                  <span className="text-xs text-[#6b6375]">Format: 1234 5678 9012</span>
                )}
                <span className="text-xs text-[#6b6375]">
                  {formData.aadhaarNumber.replace(/\s/g, '').length}/12
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-purple-900/5 border border-purple-100/50 p-5 mb-6">
          <h3 className="text-sm font-semibold text-[#08060d] mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#aa3bff]" />
            Address Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#6b6375] mb-2">
                Complete Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="House/Flat No., Street, Locality"
                rows={3}
                className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl text-[#08060d] placeholder:text-gray-400 focus:outline-none transition-all resize-none ${
                  errors.address && touched.address
                    ? 'border-red-400 bg-red-50/30'
                    : 'border-gray-200 focus:border-[#aa3bff] focus:bg-white'
                }`}
              />
              {errors.address && touched.address && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.address}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6b6375] mb-2">
                PIN Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="pinCode"
                  value={formData.pinCode}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="123456"
                  maxLength={6}
                  className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl text-[#08060d] placeholder:text-gray-400 focus:outline-none transition-all font-mono ${
                    errors.pinCode && touched.pinCode
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-gray-200 focus:border-[#aa3bff] focus:bg-white'
                  }`}
                />
                {formData.pinCode.length === 6 && !errors.pinCode && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.pinCode && touched.pinCode && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.pinCode}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#6b6375] mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="City"
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl text-[#08060d] placeholder:text-gray-400 focus:outline-none transition-all ${
                      errors.city && touched.city
                        ? 'border-red-400 bg-red-50/30'
                        : 'border-gray-200 focus:border-[#aa3bff] focus:bg-white'
                    }`}
                  />
                  <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.city && touched.city && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.city}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#6b6375] mb-2">
                  State <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="State"
                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-2xl text-[#08060d] placeholder:text-gray-400 focus:outline-none transition-all ${
                      errors.state && touched.state
                        ? 'border-red-400 bg-red-50/30'
                        : 'border-gray-200 focus:border-[#aa3bff] focus:bg-white'
                    }`}
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.state && touched.state && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.state}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="w-5 h-5 rounded-lg border-2 border-purple-300 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer"
              />
            </div>
            <span className="text-xs text-[#6b6375] leading-relaxed">
              I hereby declare that the information provided is true and accurate to the best of my knowledge.
              I consent to the verification of my identity documents and understand that this is required as per
              RBI guidelines for KYC compliance. I authorize the use of my Aadhaar/PAN for identity verification
              purposes in accordance with the Prevention of Money Laundering Act, 2002.
            </span>
          </label>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full">
            <Shield className="w-4 h-4 text-[#aa3bff]" />
            <span className="text-xs font-medium text-[#6b6375]">
              256-bit SSL Secured • RBI Compliant
            </span>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-purple-100/50 z-20">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!isFormValid() || isLoading}
            className={`w-full group flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300 ${
              isFormValid() && !isLoading
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Continue to Mandate</span>
                <ArrowRight className={`w-5 h-5 transition-transform duration-300 ${isFormValid() ? 'group-hover:translate-x-1' : ''}`} />
              </>
            )}
          </button>
          <p className="text-center text-xs text-[#6b6375] mt-2">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default KYCSetup;

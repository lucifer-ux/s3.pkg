import { createContext, useContext, useState } from 'react';

const LoanContext = createContext();

export function LoanProvider({ children }) {
  const [loanData, setLoanData] = useState({
    phoneNumber: '',
    panNumber: '',
    customerPhoto: null,
    age: null,
    gender: null,
    livelinessCheck: false,
    bureauData: null,
    selectedOffer: null,
    kycCompleted: false,
    mandateSetup: false,
  });

  const updateLoanData = (key, value) => {
    setLoanData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetLoanData = () => {
    setLoanData({
      phoneNumber: '',
      panNumber: '',
      customerPhoto: null,
      age: null,
      gender: null,
      livelinessCheck: false,
      bureauData: null,
      selectedOffer: null,
      kycCompleted: false,
      mandateSetup: false,
    });
  };

  return (
    <LoanContext.Provider value={{ loanData, updateLoanData, resetLoanData }}>
      {children}
    </LoanContext.Provider>
  );
}

export function useLoan() {
  const context = useContext(LoanContext);
  if (!context) {
    throw new Error('useLoan must be used within a LoanProvider');
  }
  return context;
}

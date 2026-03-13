import { useState } from 'react';
import AIShopper from './AIShopper'
import LoanFlow from './LoanFlow'
import ProductPurchaseScreen from './ProductPurchaseScreen'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('shopping');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCurrentView('purchase');
  };

  const handleStartLoanFlow = () => {
    setCurrentView('loan');
  };

  const handleBackToShopping = () => {
    setCurrentView('shopping');
    setSelectedProduct(null);
  };

  const handleBackToPurchase = () => {
    setCurrentView('purchase');
  };

  return (
    <div className="app-container">
      {currentView === 'shopping' && (
        <AIShopper onProductSelect={handleProductSelect} />
      )}
      
      {currentView === 'purchase' && selectedProduct && (
        <ProductPurchaseScreen 
          product={selectedProduct}
          onBack={handleBackToShopping}
          onBuy={() => setCurrentView('payment')}
          onPayViaLoan={handleStartLoanFlow}
        />
      )}
      
      {currentView === 'loan' && (
        <LoanFlow 
          product={selectedProduct}
          onBackToShopping={handleBackToShopping}
          onBackToPurchase={handleBackToPurchase}
        />
      )}
    </div>
  );
}

export default App

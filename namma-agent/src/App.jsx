import { useState } from 'react';
import AIShopper from './AIShopper'
import LoanChat from './LoanChat'
import ProductPurchaseScreen from './ProductPurchaseScreen'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [currentView, setCurrentView] = useState('shopping');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderId, setOrderId] = useState(null);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setCurrentView('purchase');
  };

  const handleStartLoanFlow = async () => {
    console.log('[App] Creating order for loan flow...');
    
    try {
      const response = await fetch(`${API_URL}/api/loan/order/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: selectedProduct,
          paymentMethod: 'emi',
          metadata: { source: 'web' },
        }),
      });

      const data = await response.json();
      console.log('[App] Order creation response:', data);

      if (data.success && data.orderId) {
        setOrderId(data.orderId);
        console.log('[App] Order created with ID:', data.orderId);
      } else {
        console.error('[App] Failed to create order:', data.error);
      }
    } catch (error) {
      console.error('[App] Error creating order:', error);
    }
    
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
        <LoanChat 
          product={selectedProduct}
          onBackToShopping={handleBackToShopping}
          orderId={orderId}
        />
      )}
    </div>
  );
}

export default App

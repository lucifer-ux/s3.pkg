import { useState } from 'react';
   import { ArrowLeft, Share2, Sparkles, Crown, ArrowRight, RefreshCw, ArrowRightLeft, Wallet } from 'lucide-react';
   import ProductComparison from './ProductComparison';
   import './ProductPurchaseScreen.css';
   
   const purchaseData = {
     original: {
       id: 2,
       name: 'iPhone 15 Pro',
       price: 999,
       originalPrice: 1099,
       image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400&h=500&fit=crop',
       badge: 'EDITOR\'S CHOICE',
       aiReason: 'Based on your photography usage patterns, we\'ve identified a configuration with a superior camera system that matches your creative needs.',
     },
     suggested: {
       id: 3,
       name: 'Galaxy S24 Ultra',
       price: 999,
       originalPrice: 1299,
       image: 'https://images.unsplash.com/photo-1610945265078-3858a0828671?w=400&h=500&fit=crop',
       improvements: ['more RAM', 'better camera', 'larger display'],
       specs: {
         battery: '5000 mAh',
         display: '6.8" AMOLED',
         camera: '200MP Quad',
         ram: '12GB',
       },
     },
   };
   
   function ProductPurchaseScreen({ product, onBack, onBuy, onPayViaLoan }) {
     const [currentProduct, setCurrentProduct] = useState(product || purchaseData.original);
     const [suggestedProduct] = useState(purchaseData.suggested);
     const [showComparison, setShowComparison] = useState(false);
     const [hasSwapped, setHasSwapped] = useState(false);
     const [showPaymentOptions, setShowPaymentOptions] = useState(false);
   
     const handleSwap = () => {
       setCurrentProduct(suggestedProduct);
       setHasSwapped(true);
     };
   
     const handleSwapBack = () => {
       setCurrentProduct(purchaseData.original);
       setHasSwapped(false);
     };
   
     const handleCompare = () => {
       setShowComparison(true);
     };
   
     const handleCloseComparison = () => {
       setShowComparison(false);
     };
   
     const handleBuy = () => {
       onBuy?.(currentProduct);
     };
   
     // Determine which products to compare
     const productsToCompare = hasSwapped 
       ? [suggestedProduct.id, purchaseData.original.id]
       : [purchaseData.original.id, suggestedProduct.id];
   
     return (
       <div className="purchase-overlay">
         <div className="purchase-container">
           {/* Header */}
           <div className="purchase-header">
             <button className="purchase-back-btn" onClick={onBack}>
               <ArrowLeft size={24} />
             </button>
             <h2 className="purchase-title">Product Details</h2>
             <button className="purchase-share-btn">
               <Share2 size={20} />
             </button>
           </div>
   
           {/* Scrollable Content */}
           <div className="purchase-content">
             {/* Product Image */}
             <div className="purchase-image-container">
               <img 
                 src={currentProduct.image} 
                 alt={currentProduct.name}
                 className="purchase-image"
               />
             </div>
   
             {/* Product Info */}
             <div className="purchase-info">
               {currentProduct.badge && (
                 <span className="purchase-badge">{currentProduct.badge}</span>
               )}
               <h1 className="purchase-product-name">{currentProduct.name}</h1>
               <div className="purchase-price-row">
                 <span className="purchase-current-price">${currentProduct.price}.00</span>
                 <span className="purchase-original-price">${currentProduct.originalPrice}.00</span>
               </div>
             </div>
   
             {/* AI Recommendation */}
             <div className="ai-recommendation">
               <div className="ai-header">
                 <Sparkles size={18} className="ai-icon" />
                 <span>AI RECOMMENDATION</span>
               </div>
               <p className="ai-text">{purchaseData.original.aiReason}</p>
             </div>
   
             {/* Swap Suggestion Card */}
             {!hasSwapped && currentProduct.id === purchaseData.original.id && (
               <div className="swap-suggestion">
                 <div className="swap-header">
                   <div className="crown-icon">
                     <Crown size={20} />
                   </div>
                   <div className="swap-text">
                     <p>For the same price, get <span className="highlight-model">{suggestedProduct.name}</span> with {suggestedProduct.improvements.join(', ')}.</p>
                   </div>
                 </div>
                 <div className="swap-actions">
                   <button className="swap-now-btn" onClick={handleSwap}>
                     Swap Now
                   </button>
                   <button className="compare-btn" onClick={handleCompare}>
                     <ArrowRightLeft size={14} />
                     Compare
                   </button>
                   <button className="keep-choice-btn" onClick={() => {}}>
                     Keep my choice
                   </button>
                 </div>
               </div>
             )}
   
             {/* Swap Back Option */}
             {hasSwapped && (
               <div className="swap-back-section">
                 <div className="swapped-info">
                   <p>You swapped to <strong>{currentProduct.name}</strong></p>
                 </div>
                 <button className="swap-back-btn" onClick={handleSwapBack}>
                   <RefreshCw size={16} />
                   Swap back to {purchaseData.original.name}
                 </button>
                 <button className="compare-btn small" onClick={handleCompare}>
                   <ArrowRightLeft size={14} />
                   Compare devices
                 </button>
               </div>
             )}
           </div>
   
           <div className="purchase-footer">
             {!showPaymentOptions ? (
               <button className="buy-now-btn" onClick={() => setShowPaymentOptions(true)}>
                 Buy Now
                 <ArrowRight size={20} />
               </button>
             ) : (
               <div className="payment-options">
                 <h4 className="payment-options-title">Choose Payment Method</h4>
                 <button className="payment-btn primary" onClick={handleBuy}>
                   <span className="payment-btn-title">Pay Full Amount</span>
                   <span className="payment-btn-amount">${currentProduct.price}.00</span>
                 </button>
                 <button className="payment-btn loan" onClick={onPayViaLoan}>
                   <Wallet size={20} />
                   <div className="payment-btn-content">
                     <span className="payment-btn-title">Pay via Loan / EMI</span>
                     <span className="payment-btn-subtitle">Starting at $45/month</span>
                   </div>
                   <ArrowRight size={18} />
                 </button>
                 <button className="payment-btn back" onClick={() => setShowPaymentOptions(false)}>
                   Back
                 </button>
               </div>
             )}
           </div>
         </div>
   
         {/* Comparison Modal */}
         {showComparison && (
           <ProductComparison
             selectedIds={productsToCompare}
             onClose={handleCloseComparison}
             onRemove={() => {}}
             onBuy={(product) => {
               setCurrentProduct(product);
               setHasSwapped(product.id === suggestedProduct.id);
               setShowComparison(false);
             }}
           />
         )}
       </div>
     );
   }
   
   export default ProductPurchaseScreen;
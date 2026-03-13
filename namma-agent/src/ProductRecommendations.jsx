import { useState, useMemo } from 'react';
import { Check, ArrowRightLeft, Info } from 'lucide-react';
import ProductDetailModal from './ProductDetailModal';
import './ProductRecommendations.css';
import productsData from '../products.json';

function ProductRecommendations({ onCompare }) {
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [detailProductId, setDetailProductId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const products = useMemo(() => {
    const smartphones = productsData
      .filter(product => product.category === 'Smartphones')
      .slice(0, 4);

    return smartphones.map((product) => ({
      id: product.product_id,
      name: product.name,
      price: product.skus?.[0]?.price
        ? `${product.skus[0].price.currency === 'INR' ? '₹' : '$'}${product.skus[0].price.selling_price?.toLocaleString()}`
        : '',
      tagline: product.highlights?.[0] || product.description?.substring(0, 60) + '...',
      image: product.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=400&h=400&fit=crop',
    }));
  }, []);

  const toggleSelection = (productId) => {
    setSelectedProducts((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [...prev, productId];
    });
  };

  const handleCompare = () => {
    if (selectedProducts.length < 2) {
      alert('Please select at least 2 devices to compare');
      return;
    }
    if (selectedProducts.length > 3) {
      alert('You can compare maximum 3 devices at a time');
      return;
    }
    onCompare?.(selectedProducts);
  };

  const handleOpenDetail = (productId, e) => {
    e.stopPropagation();
    setDetailProductId(productId);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDetailProductId(null);
  };

  const handleDetailCompare = (product) => {
    if (!selectedProducts.includes(product.id)) {
      setSelectedProducts((prev) => [...prev, product.id]);
    }
    handleCloseDetail();
  };

  const handleBuy = (product) => {
    alert(`Proceeding to buy ${product.name}!`);
    handleCloseDetail();
  };

  return (
    <div className="product-recommendations">
      {/* Header Banner */}
      <div className="recommendations-header">
        <span className="sparkle">✨</span>
        <span>Here are the best phones for you</span>
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {products.map((product) => {
          const isSelected = selectedProducts.includes(product.id);
          
          return (
            <div
              key={product.id}
              className={`product-card ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleSelection(product.id)}
            >
              {/* Checkbox */}
              <div className={`product-checkbox ${isSelected ? 'checked' : ''}`}>
                {isSelected && <Check size={14} />}
              </div>

              {/* Product Image */}
              <div className="product-image-container">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-image"
                  onError={(e) => {
                    // e.target.src = 'https://via.placeholder.com/400x400/5b4fcf/ffffff?text=Phone';
                    e.target.src = 'https://images.unsplash.com/photo-1610945265078-3858a0828671?w=400&h=400&fit=crop';
                  }}
                />
              </div>

              {/* Product Info */}
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-price">{product.price}</p>
                <p className="product-tagline">{product.tagline}</p>
                <button 
                  className="details-button"
                  onClick={(e) => handleOpenDetail(product.id, e)}
                >
                  <Info size={14} />
                  Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={detailProductId}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onCompare={handleDetailCompare}
        onBuy={handleBuy}
      />

      {/* Compare Button */}
      {selectedProducts.length > 0 && (
        <button className="compare-button" onClick={handleCompare}>
          <ArrowRightLeft size={18} />
          <span>Compare ({selectedProducts.length})</span>
        </button>
      )}
    </div>
  );
}

export default ProductRecommendations;
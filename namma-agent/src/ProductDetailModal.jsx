
import { X, Cpu, CheckCircle, List, Camera, Battery, Monitor, LayoutGrid } from 'lucide-react';
import './ProductDetailModal.css';

const productSpecs = {
  1: {
    name: 'Pixel 8 Pro',
    series: 'Flagship Series',
    price: '$999',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=400&h=400&fit=crop',
    specs: [
      { icon: Cpu, label: 'Processor', value: 'Google Tensor G3 4nm' },
      { icon: CheckCircle, label: 'Memory (RAM)', value: '12GB LPDDR5X' },
      { icon: List, label: 'Storage', value: '128GB / 256GB / 512GB UFS 3.1' },
      { icon: Camera, label: 'Camera System', value: '50MP Main + 48MP Ultra-Wide + 48MP Telephoto' },
      { icon: Battery, label: 'Battery', value: '5050mAh with 30W Fast Charging' },
      { icon: Monitor, label: 'Display', value: '6.7" LTPO OLED, 120Hz, 2400 nits' },
      { icon: LayoutGrid, label: 'Operating System', value: 'Android 14 with Pixel UI' },
    ],
  },
  2: {
    name: 'iPhone 15 Pro',
    series: 'Pro Series',
    price: '$1,099',
    image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400&h=400&fit=crop',
    specs: [
      { icon: Cpu, label: 'Processor', value: 'A17 Pro 3nm' },
      { icon: CheckCircle, label: 'Memory (RAM)', value: '8GB LPDDR5' },
      { icon: List, label: 'Storage', value: '256GB / 512GB / 1TB NVMe' },
      { icon: Camera, label: 'Camera System', value: '48MP Main + 12MP Ultra-Wide + 12MP Telephoto' },
      { icon: Battery, label: 'Battery', value: '3274mAh with 20W Fast Charging' },
      { icon: Monitor, label: 'Display', value: '6.1" LTPO Super Retina XDR, 120Hz, 2000 nits' },
      { icon: LayoutGrid, label: 'Operating System', value: 'iOS 17' },
    ],
  },
  3: {
    name: 'Galaxy S24 Ultra',
    series: 'Ultra Series',
    price: '$1,299',
    image: 'https://images.unsplash.com/photo-1610945265078-3858a0828671?w=400&h=400&fit=crop',
    specs: [
      { icon: Cpu, label: 'Processor', value: 'Snapdragon 8 Gen 3 4nm' },
      { icon: CheckCircle, label: 'Memory (RAM)', value: '12GB LPDDR5X' },
      { icon: List, label: 'Storage', value: '256GB / 512GB / 1TB UFS 4.0' },
      { icon: Camera, label: 'Camera System', value: '200MP Main + 12MP Ultra-Wide + 10MP Telephoto + 10MP Periscope' },
      { icon: Battery, label: 'Battery', value: '5000mAh with 45W Fast Charging' },
      { icon: Monitor, label: 'Display', value: '6.8" LTPO AMOLED, 120Hz, 2600 nits' },
      { icon: LayoutGrid, label: 'Operating System', value: 'Android 14 with One UI 6.1' },
    ],
  },
  4: {
    name: 'OnePlus 12',
    series: 'Flagship Series',
    price: '$799',
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop',
    specs: [
      { icon: Cpu, label: 'Processor', value: 'Snapdragon 8 Gen 3 4nm' },
      { icon: CheckCircle, label: 'Memory (RAM)', value: '12GB / 16GB LPDDR5X' },
      { icon: List, label: 'Storage', value: '256GB / 512GB UFS 4.0' },
      { icon: Camera, label: 'Camera System', value: '50MP Main + 48MP Ultra-Wide + 64MP Telephoto' },
      { icon: Battery, label: 'Battery', value: '5400mAh with 100W Fast Charging' },
      { icon: Monitor, label: 'Display', value: '6.82" LTPO AMOLED, 120Hz, 4500 nits' },
      { icon: LayoutGrid, label: 'Operating System', value: 'Android 14 with OxygenOS 14' },
    ],
  },
};

function ProductDetailModal({ productId, isOpen, onClose, onCompare, onBuy }) {
  if (!isOpen || !productId) return null;

  const product = productSpecs[productId];
  if (!product) return null;

  return (
    <div className="product-detail-overlay">
      <div className="product-detail-modal">
        {/* Close Button */}
        <button className="detail-close-button" onClick={onClose}>
          <X size={24} />
        </button>

        {/* Product Header */}
        <div className="product-detail-header">
          <div className="product-detail-image">
            <img
              src={product.image}
              alt={product.name}
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/400x400/5b4fcf/ffffff?text=Phone';
              }}
            />
          </div>
          <div className="product-detail-info">
            <h2 className="detail-product-name">{product.name}</h2>
            <p className="detail-product-series">{product.series}</p>
            <p className="detail-product-price">{product.price}</p>
          </div>
        </div>

        {/* Specifications */}
        <div className="specifications-section">
          <h3 className="specs-title">CORE SPECIFICATIONS</h3>
          <div className="specs-list">
            {product.specs.map((spec, index) => {
              const Icon = spec.icon;
              return (
                <div key={index} className="spec-item">
                  <div className="spec-icon">
                    <Icon size={20} />
                  </div>
                  <div className="spec-content">
                    <p className="spec-label">{spec.label}</p>
                    <p className="spec-value">{spec.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* Action Buttons */}
        <div className="detail-actions">
          <button className="detail-buy-button full-width" onClick={() => onBuy?.(product)}>
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailModal;
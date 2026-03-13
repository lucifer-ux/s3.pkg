
import { X, Cpu, CheckCircle, List, Camera, Battery, Monitor, LayoutGrid } from 'lucide-react';
import './ProductDetailModal.css';
import productsData from '../products.json';

// Dynamically get top 4 smartphones from products.json
const smartphones = productsData
  .filter(p => p.category === 'Smartphones')
  .slice(0, 4);

const productIdMap = Object.fromEntries(
  smartphones.map((p, index) => [index + 1, p.product_id])
);

// Transform products.json data to modal format
function getProductSpecs(productId) {
  const mappedId = productIdMap[productId];
  if (!mappedId) return null;

  const product = productsData.find(p => p.product_id === mappedId);
  if (!product) return null;

  // Build camera string
  const cameraRear = product.camera?.rear || [];
  const cameraStr = cameraRear.length > 0
    ? cameraRear.map(c => `${c.megapixels}MP ${c.type}`).join(' + ')
    : 'N/A';

  // Get price from first SKU
  const firstSku = product.skus?.[0];
  const price = firstSku?.price
    ? `${firstSku.price.currency} ${firstSku.price.selling_price.toLocaleString()}`
    : 'N/A';

  // Get storage options
  const storageOptions = product.options?.storage?.join(' / ') || 'N/A';

  return {
    name: product.name,
    series: product.category,
    price,
    image: product.images?.[0] || 'https://via.placeholder.com/400x400/5b4fcf/ffffff?text=Product',
    specs: [
      { icon: Cpu, label: 'Processor', value: product.processor?.chipset || 'N/A' },
      { icon: CheckCircle, label: 'Memory (RAM)', value: product.memory?.ram || 'N/A' },
      { icon: List, label: 'Storage', value: storageOptions },
      { icon: Camera, label: 'Camera System', value: cameraStr },
      { icon: Battery, label: 'Battery', value: product.battery?.capacity_mAh ? `${product.battery.capacity_mAh}mAh` : 'N/A' },
      { icon: Monitor, label: 'Display', value: product.display ? `${product.display.size_inches}" ${product.display.type}` : 'N/A' },
      { icon: LayoutGrid, label: 'Operating System', value: product.os?.version || 'N/A' },
    ],
  };
}

function ProductDetailModal({ productId, isOpen, onClose, onCompare, onBuy }) {
  if (!isOpen || !productId) return null;

  const product = getProductSpecs(productId);
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
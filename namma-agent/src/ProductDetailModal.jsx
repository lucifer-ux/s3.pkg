import { X, Cpu, CheckCircle, List, Camera, Battery, Monitor, LayoutGrid } from 'lucide-react';
import './ProductDetailModal.css';
import productsData from '../products.json';

function getProductSpecs(productId) {
  if (!productId) return null;
  
  try {
    const product = productsData.find(p => p.product_id === productId);
    if (!product) return null;

    const cameraRear = product.camera?.rear || [];
    const cameraStr = cameraRear.length > 0
      ? cameraRear.map(c => `${c.megapixels}MP ${c.type}`).join(' + ')
      : 'N/A';

    const firstSku = product.skus?.[0];
    const price = firstSku?.price
      ? `${firstSku.price.currency} ${firstSku.price.selling_price.toLocaleString()}`
      : 'N/A';

    const storageOptions = product.options?.storage?.join(' / ') || 'N/A';

    return {
      id: product.product_id,
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
  } catch (error) {
    console.error('Error getting product specs:', error);
    return null;
  }
}

function ProductDetailModal({ productId, isOpen, onClose, onCompare, onBuy }) {
  if (!isOpen || !productId) return null;

  const product = getProductSpecs(productId);
  if (!product) {
    return (
      <div className="product-detail-overlay" onClick={onClose}>
        <div className="product-detail-modal">
          <button className="detail-close-button" onClick={onClose}>
            <X size={24} />
          </button>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Product not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-overlay" onClick={onClose}>
      <div className="product-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close-button" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="product-detail-header">
          <div className="product-detail-image">
            <img
              src={product.image}
              alt={product.name}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1610945265078-3858a0828671?w=400&h=400&fit=crop';
              }}
            />
          </div>
          <div className="product-detail-info">
            <h2 className="product-detail-name">{product.name}</h2>
            <p className="product-detail-series">{product.series}</p>
            <p className="product-detail-price">{product.price}</p>
          </div>
        </div>

        <div className="product-detail-specs">
          <h3 className="specs-title">Specifications</h3>
          <div className="specs-grid">
            {product.specs.map((spec, index) => (
              <div key={index} className="spec-item">
                <spec.icon size={20} className="spec-icon" />
                <div className="spec-content">
                  <span className="spec-label">{spec.label}</span>
                  <span className="spec-value">{spec.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="product-detail-actions">
          <button className="action-btn secondary" onClick={() => onCompare?.(product)}>
            Add to Compare
          </button>
          <button className="action-btn primary" onClick={() => onBuy?.(product)}>
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailModal;

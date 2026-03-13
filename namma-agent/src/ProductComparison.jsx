import { useState, useMemo } from 'react';
import { X, ChevronLeft, Sparkles, Battery, Monitor, Camera, Cpu } from 'lucide-react';
import './ProductComparison.css';

const comparisonData = {
  1: {
    id: 1,
    name: 'Pixel 8 Pro',
    shortName: 'Pixel 8',
    image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=200&h=200&fit=crop',
    price: 999,
    specs: {
      battery: { value: '5050 mAh', score: 85 },
      display: { value: '6.7" OLED', score: 90 },
      camera: { value: '50MP Triple', score: 95 },
      ram: { value: '12GB', score: 90 },
      processor: { value: 'Tensor G3', score: 85 },
    },
  },
  2: {
    id: 2,
    name: 'iPhone 15 Pro',
    shortName: 'iPhone 15',
    image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=200&h=200&fit=crop',
    price: 1099,
    specs: {
      battery: { value: '3274 mAh', score: 70 },
      display: { value: '6.1" OLED', score: 88 },
      camera: { value: '48MP Triple', score: 92 },
      ram: { value: '8GB', score: 75 },
      processor: { value: 'A17 Pro', score: 98 },
    },
  },
  3: {
    id: 3,
    name: 'Galaxy S24 Ultra',
    shortName: 'S24 Ultra',
    image: 'https://images.unsplash.com/photo-1610945265078-3858a0828671?w=200&h=200&fit=crop',
    price: 1299,
    specs: {
      battery: { value: '5000 mAh', score: 88 },
      display: { value: '6.8" AMOLED', score: 95 },
      camera: { value: '200MP Quad', score: 98 },
      ram: { value: '12GB', score: 90 },
      processor: { value: 'Snapdragon 8', score: 95 },
    },
  },
  4: {
    id: 4,
    name: 'OnePlus 12',
    shortName: 'OnePlus 12',
    image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=200&h=200&fit=crop',
    price: 799,
    specs: {
      battery: { value: '5400 mAh', score: 95 },
      display: { value: '6.8" AMOLED', score: 92 },
      camera: { value: '50MP Triple', score: 85 },
      ram: { value: '16GB', score: 98 },
      processor: { value: 'Snapdragon 8', score: 95 },
    },
  },
};

const specLabels = {
  battery: { icon: Battery, label: 'Battery' },
  display: { icon: Monitor, label: 'Display' },
  camera: { icon: Camera, label: 'Camera' },
  ram: { icon: Cpu, label: 'RAM' },
  processor: { icon: Cpu, label: 'Processor' },
};

function ProductComparison({ selectedIds, onClose, onRemove, onBuy }) {
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  const products = useMemo(() => {
    return selectedIds.map(id => comparisonData[id]).filter(Boolean);
  }, [selectedIds]);
  
  const bestDevice = useMemo(() => {
    if (products.length === 0) return null;
    return products.reduce((best, current) => {
      const bestScore = Object.values(best.specs).reduce((sum, s) => sum + s.score, 0);
      const currentScore = Object.values(current.specs).reduce((sum, s) => sum + s.score, 0);
      return currentScore > bestScore ? current : best;
    });
  }, [products]);
  
  const handleRemove = (id) => {
    onRemove?.(id);
  };
  
  const handleProceed = () => {
    if (selectedDevice) {
      onBuy?.(selectedDevice);
    }
  };
  
  const getInsight = (specKey) => {
    const values = products.map(p => ({ id: p.id, value: p.specs[specKey].value, score: p.specs[specKey].score }));
    const best = values.reduce((max, curr) => curr.score > max.score ? curr : max);
    const insights = {
      battery: `${best.value} - Best endurance`,
      display: `${best.value} - Most vibrant`,
      camera: `${best.value} - Sharpest photos`,
      ram: `${best.value} - Smoothest multitasking`,
      processor: `${best.value} - Fastest performance`,
    };
    return { bestId: best.id, text: insights[specKey] };
  };
  
  const columnWidth = products.length === 2 ? '50%' : '33.33%';
  
  return (
    <div className="comparison-overlay">
      <div className="comparison-container">
        {/* Header */}
        <div className="comparison-header">
          <button className="back-button" onClick={onClose}>
            <ChevronLeft size={24} />
          </button>
          <h2 className="comparison-title">Compare {products.length} Phones</h2>
          <div className="header-spacer"></div>
        </div>
        
        {/* Devices Header Row */}
        <div className="devices-header">
          {products.map(product => (
            <div 
              key={product.id} 
              className={`device-header-col ${selectedDevice?.id === product.id ? 'selected' : ''}`}
              style={{ width: columnWidth }}
              onClick={() => setSelectedDevice(product)}
            >
              <button 
                className="remove-device-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(product.id);
                }}
              >
                <X size={14} />
              </button>
              <div className="device-image-small">
                <img src={product.image} alt={product.name} />
              </div>
              <span className="device-short-name">{product.shortName}</span>
              <span className="device-price">${product.price}</span>
            </div>
          ))}
        </div>
        
        {/* Scrollable Content */}
        <div className="comparison-scroll-content">
          {/* Spec Rows */}
          {Object.entries(specLabels).map(([key, { icon: Icon, label }]) => {
            const insight = getInsight(key);
            return (
              <div key={key} className="comparison-section">
                <div className="spec-category-header">
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
                <div className="spec-values-row">
                  {products.map(product => {
                    const isBest = product.id === insight.bestId;
                    return (
                      <div 
                        key={product.id} 
                        className={`spec-value-col ${isBest ? 'best' : ''}`}
                        style={{ width: columnWidth }}
                      >
                        {product.specs[key].value}
                      </div>
                    );
                  })}
                </div>
                <div className="insight-box">
                  <Sparkles size={14} className="insight-icon" />
                  <span className="insight-text">{insight.text}</span>
                </div>
              </div>
            );
          })}
          
          {/* Bottom Recommendation */}
          <div className="recommendation-box">
            <div className="rec-item">
              <span className="rec-label">🏆 Best Overall</span>
              <span className="rec-device">{bestDevice?.name}</span>
            </div>
          </div>
        </div>
        
        {/* Bottom Action */}
        <div className="comparison-footer">
          {selectedDevice ? (
            <button className="proceed-button" onClick={handleProceed}>
              Proceed with {selectedDevice.name}
              <span className="proceed-price">${selectedDevice.price}</span>
            </button>
          ) : (
            <p className="select-prompt">Tap a device to select</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductComparison;
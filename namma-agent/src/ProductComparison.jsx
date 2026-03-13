import { useState, useMemo } from 'react';
import { X, ChevronLeft, Sparkles, Battery, Monitor, Camera, Cpu } from 'lucide-react';
import './ProductComparison.css';
import productsData from '../products.json';

const buildComparisonData = () => {
  const smartphones = productsData
    .filter(product => product.category === 'Smartphones')
    .slice(0, 4);

  const data = {};
  smartphones.forEach(product => {
    data[product.product_id] = {
      id: product.product_id,
      name: product.name,
      shortName: product.name.split(' ').slice(0, 3).join(' '),
      image: product.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=200&h=200&fit=crop',
      price: product.skus?.[0]?.price?.selling_price || 0,
      specs: {
        battery: { value: product.battery?.capacity_mAh ? `${product.battery.capacity_mAh} mAh` : 'N/A', score: product.battery?.capacity_mAh ? Math.min(product.battery.capacity_mAh / 60, 100) : 50 },
        display: { value: product.display?.size_inches ? `${product.display.size_inches}" ${product.display.type}` : 'N/A', score: product.display?.size_inches ? Math.min(product.display.size_inches * 12, 100) : 70 },
        camera: { value: product.camera?.rear?.[0]?.megapixels ? `${product.camera.rear[0].megapixels}MP` : 'N/A', score: product.camera?.rear?.[0]?.megapixels ? Math.min(product.camera.rear[0].megapixels / 2.5, 100) : 70 },
        ram: { value: product.memory?.ram || 'N/A', score: product.memory?.ram ? parseInt(product.memory.ram) * 5 : 60 },
        processor: { value: product.processor?.chipset || 'N/A', score: product.processor?.chipset?.includes('A17') || product.processor?.chipset?.includes('Snapdragon 8') ? 95 : 80 },
      },
    };
  });

  return data;
};

const comparisonData = buildComparisonData();

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
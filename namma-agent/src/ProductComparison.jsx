import { useState, useMemo } from 'react';
import { X, ChevronLeft, Sparkles, Battery, Monitor, Camera, Cpu, Smartphone, Zap, Star, Wifi, Award } from 'lucide-react';
import './ProductComparison.css';
import productsData from '../products.json';
import llmFeed from '../llmfeed.json';

// Parse specs from product data (structured fields first, then highlights as fallback)
const parseSpecsFromProduct = (product) => {
  const text = [...(product.highlights || []), product.description || ''].join(' ').toLowerCase();

  // Extract processor - check structured field first
  let processor = 'N/A';
  if (product.processor?.chipset) {
    processor = product.processor.chipset;
  } else {
    const procMatch = text.match(/(snapdragon|dimensity|a15|a16|a17|a18|exynos)[\s\w]*/i);
    if (procMatch) processor = procMatch[0];
  }

  // Extract RAM - check structured field first
  let ram = 'N/A';
  if (product.memory?.ram) {
    ram = product.memory.ram;
  } else {
    const ramMatch = text.match(/(\d+)\s?gb\s+(?:ram|ddr)/i) || text.match(/(\d+)gb\s+ram/i);
    if (ramMatch) ram = `${ramMatch[1]}GB`;
  }

  // Extract storage - will be overridden by SKU storage
  let storage = 'N/A';
  const storageMatch = text.match(/(\d+)\s?gb\s+(?:storage|rom)/i) || text.match(/(\d+)gb\s+storage/i);
  if (storageMatch) storage = `${storageMatch[1]}GB`;

  // Extract display - check structured fields first
  let displaySize = 'N/A';
  let displayType = 'N/A';
  let refreshRate = '60Hz';

  if (product.display?.size_inches) {
    displaySize = `${product.display.size_inches}"`;
  } else {
    const displayMatch = text.match(/(\d+\.?\d*)\s?[-]?\s?inch/i);
    if (displayMatch) displaySize = `${displayMatch[1]}"`;
  }

  if (product.display?.type) {
    displayType = product.display.type;
  } else {
    if (text.includes('amoled')) displayType = 'AMOLED';
    else if (text.includes('oled')) displayType = 'OLED';
    else if (text.includes('ips')) displayType = 'IPS';
    else if (text.includes('lcd')) displayType = 'LCD';
  }

  if (product.display?.refresh_rate_hz) {
    refreshRate = `${product.display.refresh_rate_hz}Hz`;
  } else {
    if (text.includes('120hz')) refreshRate = '120Hz';
    else if (text.includes('90hz')) refreshRate = '90Hz';
  }

  // Extract camera - check structured field first
  let camera = 'N/A';
  if (product.camera?.rear?.[0]?.megapixels) {
    camera = `${product.camera.rear[0].megapixels}MP`;
  } else {
    const camMatch = text.match(/(\d+)\s?mp/i) || text.match(/(\d+)mp/i);
    if (camMatch) camera = `${camMatch[1]}MP`;
  }

  // Extract battery - check structured field first
  let battery = 'N/A';
  let batteryRaw = 0;
  if (product.battery?.capacity_mAh) {
    batteryRaw = product.battery.capacity_mAh;
    battery = `${batteryRaw} mAh`;
  } else {
    const battMatch = text.match(/(\d{3,4})\s?mah/i);
    if (battMatch) {
      batteryRaw = parseInt(battMatch[1]);
      battery = `${batteryRaw} mAh`;
    }
  }

  // Extract charging speed
  let charging = 'N/A';
  if (product.battery?.charging) {
    const chargeMatch = product.battery.charging.match(/(\d+)\s?w/i);
    if (chargeMatch) charging = `${chargeMatch[1]}W`;
  } else {
    const chargeMatch = text.match(/(\d+)\s?w/i) || text.match(/(\d+)w\s+charging/i);
    if (chargeMatch) charging = `${chargeMatch[1]}W`;
  }

  // Extract 5G
  const has5G = product.connectivity?.includes('5G') || text.includes('5g');

  return {
    processor: { value: processor, raw: processor },
    ram: { value: ram, raw: parseInt(ram) || 0 },
    storage: { value: storage, raw: parseInt(storage) || 0 },
    display: { value: displaySize !== 'N/A' && displayType !== 'N/A' ? `${displaySize} ${displayType}` : 'N/A', size: parseFloat(displaySize) || 0, type: displayType, refreshRate },
    refreshRate: { value: refreshRate, raw: parseInt(refreshRate) || 60 },
    camera: { value: camera, raw: parseInt(camera) || 0 },
    battery: { value: battery, raw: batteryRaw },
    charging: { value: charging, raw: parseInt(charging) || 0 },
    has5G: { value: has5G ? 'Yes' : 'No', raw: has5G },
  };
};

// Get insight for each spec type
const getSpecInsight = (specKey, specValue) => {
  try {
    switch (specKey) {
      case 'processor':
        if (!specValue || specValue === 'N/A') return llmFeed.SmartPhones.Processor[0].EntryLevel;
        const upper = specValue.toUpperCase();
        if (upper.includes('A17') || upper.includes('A18') || upper.includes('SNAPDRAGON 8') || upper.includes('DIMENSITY 9200')) {
          return llmFeed.SmartPhones.Processor[2].Flagship;
        } else if (upper.includes('SNAPDRAGON 7') || upper.includes('DIMENSITY 7') || upper.includes('SNAPDRAGON 6')) {
          return llmFeed.SmartPhones.Processor[1].MidRange;
        }
        return llmFeed.SmartPhones.Processor[0].EntryLevel;

      case 'ram':
        const gb = parseInt(specValue);
        if (gb >= 12) return llmFeed.SmartPhones.RAM[2]['8GB_or_more'];
        if (gb >= 8) return llmFeed.SmartPhones.RAM[2]['8GB_or_more'];
        if (gb >= 6) return llmFeed.SmartPhones.RAM[1]['6GB'];
        return llmFeed.SmartPhones.RAM[0]['4GB'];

      case 'storage':
        const storageGb = parseInt(specValue);
        if (storageGb >= 512) return llmFeed.SmartPhones.Storage[2]['256GB_or_more'];
        if (storageGb >= 256) return llmFeed.SmartPhones.Storage[2]['256GB_or_more'];
        if (storageGb >= 128) return llmFeed.SmartPhones.Storage[1]['128GB'];
        return llmFeed.SmartPhones.Storage[0]['64GB'];

      case 'battery':
        const mAh = parseInt(specValue);
        if (mAh >= 5500) return llmFeed.SmartPhones.BatteryCapacity[2]['6000mAh'];
        if (mAh >= 4800) return llmFeed.SmartPhones.BatteryCapacity[1]['5000mAh'];
        return llmFeed.SmartPhones.BatteryCapacity[0]['4000mAh'];

      case 'charging':
        const watts = parseInt(specValue);
        if (watts >= 80) return llmFeed.SmartPhones.ChargingSpeed[2].SuperFastCharging;
        if (watts >= 30) return llmFeed.SmartPhones.ChargingSpeed[1].FastCharging;
        return llmFeed.SmartPhones.ChargingSpeed[0].NormalCharging;

      default:
        return null;
    }
  } catch (e) {
    return null;
  }
};

// Build product data from actual products.json
const buildProductData = (productId) => {
  const product = productsData.find(p => p.product_id === productId);
  if (!product) return null;

  const sku = product.skus?.[0] || {};
  const price = sku.price?.selling_price || sku.price?.mrp || 0;
  const storage = sku.storage || 'N/A';

  // Parse specs from product data (structured fields + highlights fallback)
  const specs = parseSpecsFromProduct(product);
  // Override storage with actual SKU storage
  specs.storage = { value: storage, raw: parseInt(storage) || 0 };

  // Add insights to each spec
  Object.keys(specs).forEach(key => {
    if (specs[key] && key !== 'display' && key !== 'has5G') {
      specs[key].insight = getSpecInsight(key, specs[key].value);
    }
  });

  // Add display insight
  if (specs.display.type !== 'N/A') {
    const typeKey = specs.display.type === 'AMOLED' ? 'AMOLED' : specs.display.type === 'OLED' ? 'OLED' : 'LCD';
    const displayTypeData = llmFeed.SmartPhones.DisplayType.find(d => d[typeKey])?.[typeKey];

    const rateKey = specs.refreshRate.raw >= 120 ? '120Hz' : specs.refreshRate.raw >= 90 ? '90Hz' : '60Hz';
    const refreshData = llmFeed.SmartPhones.RefreshRate.find(r => r[rateKey])?.[rateKey];

    if (displayTypeData && refreshData) {
      specs.display.insight = {
        description: `${displayTypeData.description} ${refreshData.description}`,
        example: `${displayTypeData.example} ${refreshData.example}`
      };
    }
  }

  return {
    id: product.product_id,
    name: product.name,
    shortName: product.name.split(' ').slice(0, 3).join(' '),
    image: product.assets?.main_image?.url_medium || product.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=200&h=200&fit=crop',
    price: price,
    formattedPrice: `₹${price.toLocaleString('en-IN')}`,
    brand: product.brand,
    rating: product.ratings?.average_rating,
    totalReviews: product.ratings?.total_reviews,
    highlights: product.highlights || [],
    specs
  };
};

// Determine best value for each spec
const getBestSpecValue = (products, specKey) => {
  if (products.length < 2) return null;

  const values = products.map(p => ({ id: p.id, value: p.specs[specKey]?.raw, product: p })).filter(v => v.value !== undefined && v.value !== 0);
  if (values.length === 0) return null;

  // For most specs, higher is better
  const higherIsBetter = ['ram', 'storage', 'battery', 'charging', 'camera', 'refreshRate', 'rating'];
  const lowerIsBetter = []; // Add specs where lower is better if needed

  if (higherIsBetter.includes(specKey)) {
    const max = Math.max(...values.map(v => v.value));
    return values.filter(v => v.value === max).map(v => v.id);
  }

  return null;
};

const specLabels = {
  processor: { icon: Cpu, label: 'Processor', hasInsight: true },
  ram: { icon: Smartphone, label: 'RAM', hasInsight: true },
  storage: { icon: Zap, label: 'Storage', hasInsight: true },
  display: { icon: Monitor, label: 'Display', hasInsight: true },
  refreshRate: { icon: Monitor, label: 'Refresh Rate', hasInsight: false },
  camera: { icon: Camera, label: 'Main Camera', hasInsight: false },
  battery: { icon: Battery, label: 'Battery', hasInsight: true },
  charging: { icon: Zap, label: 'Charging', hasInsight: true },
  has5G: { icon: Wifi, label: '5G Support', hasInsight: false },
};

function ProductComparison({ selectedIds, onClose, onRemove, onBuy }) {
  const [selectedDevice, setSelectedDevice] = useState(null);

  const products = useMemo(() => {
    if (!selectedIds || selectedIds.length === 0) return [];
    return selectedIds.map(id => buildProductData(id)).filter(Boolean);
  }, [selectedIds]);

  // Calculate best specs for highlighting
  const bestSpecs = useMemo(() => {
    const result = {};
    Object.keys(specLabels).forEach(key => {
      result[key] = getBestSpecValue(products, key);
    });
    return result;
  }, [products]);

  // Calculate overall best device
  const bestDevice = useMemo(() => {
    if (products.length === 0) return null;

    return products.reduce((best, current) => {
      // Score based on multiple factors
      const getScore = (p) => {
        let score = 0;
        if (p.specs.ram.raw >= 12) score += 3;
        else if (p.specs.ram.raw >= 8) score += 2;
        else if (p.specs.ram.raw >= 6) score += 1;

        if (p.specs.battery.raw >= 5000) score += 2;
        else if (p.specs.battery.raw >= 4500) score += 1;

        if (p.specs.charging.raw >= 67) score += 2;
        else if (p.specs.charging.raw >= 33) score += 1;

        if (p.specs.refreshRate.raw >= 120) score += 2;
        else if (p.specs.refreshRate.raw >= 90) score += 1;

        score += (p.rating || 0) * 0.5;
        return score;
      };

      return getScore(current) > getScore(best) ? current : best;
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

  const columnWidth = products.length === 2 ? '50%' : products.length === 3 ? '33.33%' : '25%';

  if (products.length === 0) {
    return (
      <div className="comparison-overlay">
        <div className="comparison-container">
          <div className="comparison-header">
            <button className="back-button" onClick={onClose}>
              <ChevronLeft size={24} />
            </button>
            <h2 className="comparison-title">No Products to Compare</h2>
            <div className="header-spacer"></div>
          </div>
          <div className="comparison-scroll-content">
            <p className="select-prompt" style={{ padding: '40px', textAlign: 'center' }}>
              Selected products could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
              className={`device-header-col ${selectedDevice?.id === product.id ? 'selected' : ''} ${bestDevice?.id === product.id ? 'best-overall' : ''}`}
              style={{ width: columnWidth }}
              onClick={() => setSelectedDevice(product)}
            >
              {bestDevice?.id === product.id && (
                <div className="best-badge">
                  <Award size={12} />
                  Best
                </div>
              )}
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
              <span className="device-price">{product.formattedPrice}</span>
              {product.rating && (
                <span className="device-rating">
                  <Star size={12} className="star-icon" />
                  {product.rating}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="comparison-scroll-content">
          {/* Spec Rows */}
          {Object.entries(specLabels).map(([key, { icon: Icon, label, hasInsight }]) => {
            const bestIds = bestSpecs[key];
            const hasBest = bestIds && bestIds.length > 0;
            const hasInsightData = products.some(p => p.specs[key]?.insight);

            return (
              <div key={key} className="comparison-section">
                <div className="spec-category-header">
                  <Icon size={16} />
                  <span>{label}</span>
                </div>
                <div className="spec-values-row">
                  {products.map(product => {
                    const spec = product.specs[key];
                    const isBest = hasBest && bestIds.includes(product.id);
                    return (
                      <div
                        key={product.id}
                        className={`spec-value-col ${isBest ? 'best' : ''}`}
                        style={{ width: columnWidth }}
                      >
                        {spec?.value || 'N/A'}
                        {isBest && <span className="best-tag">★</span>}
                      </div>
                    );
                  })}
                </div>
                {hasInsightData && (
                  <div className="insight-box">
                    <Sparkles size={14} className="insight-icon" />
                    <div className="insight-content">
                      {products.map(product => {
                        const insight = product.specs[key]?.insight;
                        if (!insight) return null;
                        return (
                          <div key={product.id} className="insight-item">
                            <strong>{product.shortName}:</strong>
                            <p className="insight-text">{insight.description}</p>
                            <p className="insight-example">{insight.example}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom Recommendation */}
          {bestDevice && (
            <div className="recommendation-box">
              <div className="rec-item">
                <span className="rec-label">🏆 Best Overall Value</span>
                <span className="rec-device">{bestDevice.name}</span>
              </div>
              <div className="rec-reasons">
                {bestSpecs.ram?.includes(bestDevice.id) && <span className="rec-tag">Best RAM</span>}
                {bestSpecs.battery?.includes(bestDevice.id) && <span className="rec-tag">Best Battery</span>}
                {bestSpecs.charging?.includes(bestDevice.id) && <span className="rec-tag">Fastest Charging</span>}
                {bestSpecs.camera?.includes(bestDevice.id) && <span className="rec-tag">Best Camera</span>}
                {bestSpecs.storage?.includes(bestDevice.id) && <span className="rec-tag">Most Storage</span>}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <div className="comparison-footer">
          {selectedDevice ? (
            <button className="proceed-button" onClick={handleProceed}>
              Proceed with {selectedDevice.name}
              <span className="proceed-price">{selectedDevice.formattedPrice}</span>
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

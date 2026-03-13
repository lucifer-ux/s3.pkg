import express from 'express';

const router = express.Router();

// Mock product database (in production, this would be a real database)
const productsDatabase = {
  mobilePhones: [
    {
      id: 'pixel-8-pro',
      name: 'Google Pixel 8 Pro',
      brand: 'Google',
      price: 99900,
      displayPrice: '₹99,900',
      tagline: 'Best camera in range',
      image: 'https://placehold.co/400x400/4285F4/FFFFFF?text=Pixel+8+Pro',
      specs: {
        processor: { value: 'Google Tensor G3 (4nm)', score: 90 },
        battery: { value: '5050 mAh', score: 85 },
        camera: { value: '50MP Triple Camera', score: 95 },
        display: { value: '6.7" LTPO OLED 120Hz', score: 92 },
        storage: { value: '128GB / 256GB / 512GB', score: 88 },
        ram: { value: '12GB', score: 90 },
      },
      features: ['camera', 'ai', 'wireless_charging', '5g'],
      pros: ['Exceptional camera quality', 'Clean Android experience', '7 years of updates', 'AI features'],
      cons: ['Expensive', 'Average battery life', 'Slow charging compared to competition'],
      colors: ['Obsidian', 'Porcelain', 'Bay'],
      rating: 4.6,
      reviews: 1250,
    },
    {
      id: 'iphone-15-pro',
      name: 'iPhone 15 Pro',
      brand: 'Apple',
      price: 134900,
      displayPrice: '₹1,34,900',
      tagline: 'Best performance',
      image: 'https://placehold.co/400x400/1C1C1E/FFFFFF?text=iPhone+15+Pro',
      specs: {
        processor: { value: 'A17 Pro (3nm)', score: 98 },
        battery: { value: '3274 mAh', score: 70 },
        camera: { value: '48MP Pro Camera', score: 94 },
        display: { value: '6.1" LTPO OLED 120Hz', score: 93 },
        storage: { value: '128GB / 256GB / 512GB / 1TB', score: 92 },
        ram: { value: '8GB', score: 85 },
      },
      features: ['camera', 'performance', 'wireless_charging', '5g'],
      pros: ['Fastest mobile processor', 'Premium build quality', 'Excellent video recording', 'iOS ecosystem'],
      cons: ['Very expensive', 'No charger in box', 'Average battery life', 'Proprietary connector'],
      colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
      rating: 4.7,
      reviews: 3200,
    },
    {
      id: 'galaxy-s24-ultra',
      name: 'Samsung Galaxy S24 Ultra',
      brand: 'Samsung',
      price: 129999,
      displayPrice: '₹1,29,999',
      tagline: 'Pro display quality',
      image: 'https://placehold.co/400x400/1428A0/FFFFFF?text=Galaxy+S24+Ultra',
      specs: {
        processor: { value: 'Snapdragon 8 Gen 3', score: 95 },
        battery: { value: '5000 mAh', score: 88 },
        camera: { value: '200MP Quad Camera', score: 93 },
        display: { value: '6.8" AMOLED 120Hz', score: 96 },
        storage: { value: '256GB / 512GB / 1TB', score: 92 },
        ram: { value: '12GB', score: 90 },
      },
      features: ['display', 'camera', 'battery', '5g', 'spen'],
      pros: ['Best-in-class display', 'S Pen functionality', 'Great battery life', 'Versatile camera system'],
      cons: ['Very large and heavy', 'Expensive', 'Slow shutter speed causes motion blur'],
      colors: ['Titanium Gray', 'Titanium Black', 'Titanium Violet', 'Titanium Yellow'],
      rating: 4.5,
      reviews: 2100,
    },
    {
      id: 'oneplus-12',
      name: 'OnePlus 12',
      brand: 'OnePlus',
      price: 64999,
      displayPrice: '₹64,999',
      tagline: 'Fastest charging',
      image: 'https://placehold.co/400x400/FF0000/FFFFFF?text=OnePlus+12',
      specs: {
        processor: { value: 'Snapdragon 8 Gen 3', score: 95 },
        battery: { value: '5400 mAh', score: 92 },
        camera: { value: '50MP Triple Camera', score: 88 },
        display: { value: '6.82" AMOLED 120Hz', score: 91 },
        storage: { value: '256GB / 512GB', score: 88 },
        ram: { value: '12GB / 16GB', score: 92 },
      },
      features: ['charging', 'performance', 'battery', '5g'],
      pros: ['100W fast charging', 'Great value for money', 'Smooth performance', 'Good battery life'],
      cons: ['Camera not best in class', 'No IP68 rating', 'OxygenOS has bloatware'],
      colors: ['Flowy Emerald', 'Silky Black'],
      rating: 4.4,
      reviews: 1800,
    },
    {
      id: 'xiaomi-14',
      name: 'Xiaomi 14',
      brand: 'Xiaomi',
      price: 69999,
      displayPrice: '₹69,999',
      tagline: 'Compact flagship',
      image: 'https://placehold.co/400x400/FF6900/FFFFFF?text=Xiaomi+14',
      specs: {
        processor: { value: 'Snapdragon 8 Gen 3', score: 95 },
        battery: { value: '4610 mAh', score: 78 },
        camera: { value: '50MP Leica Triple', score: 90 },
        display: { value: '6.36" AMOLED 120Hz', score: 89 },
        storage: { value: '256GB / 512GB', score: 88 },
        ram: { value: '12GB', score: 90 },
      },
      features: ['camera', 'compact', 'performance', '5g'],
      pros: ['Compact size', 'Leica camera tuning', 'Great performance', 'Wireless charging'],
      cons: ['Battery could be larger', 'MIUI interface', 'Limited availability'],
      colors: ['Black', 'White', 'Green', 'Pink'],
      rating: 4.3,
      reviews: 950,
    },
    {
      id: 'nothing-phone-2',
      name: 'Nothing Phone (2)',
      brand: 'Nothing',
      price: 44999,
      displayPrice: '₹44,999',
      tagline: 'Unique design',
      image: 'https://placehold.co/400x400/000000/FFFFFF?text=Nothing+Phone+2',
      specs: {
        processor: { value: 'Snapdragon 8+ Gen 1', score: 85 },
        battery: { value: '4700 mAh', score: 80 },
        camera: { value: '50MP Dual Camera', score: 82 },
        display: { value: '6.7" LTPO OLED 120Hz', score: 88 },
        storage: { value: '128GB / 256GB / 512GB', score: 85 },
        ram: { value: '8GB / 12GB', score: 85 },
      },
      features: ['design', 'display', '5g'],
      pros: ['Unique Glyph interface', 'Clean Nothing OS', 'Good display', 'Distinctive design'],
      cons: ['Last-gen processor', 'Average camera', 'No telephoto lens'],
      colors: ['White', 'Dark Gray'],
      rating: 4.2,
      reviews: 1100,
    },
  ],
  laptops: [
    {
      id: 'macbook-pro-14',
      name: 'MacBook Pro 14"',
      brand: 'Apple',
      price: 169900,
      displayPrice: '₹1,69,900',
      tagline: 'Professional powerhouse',
      specs: {
        processor: { value: 'M3 Pro / M3 Max', score: 97 },
        memory: { value: '18GB / 36GB / 48GB', score: 95 },
        storage: { value: '512GB / 1TB / 2TB', score: 92 },
        display: { value: '14.2" Liquid Retina XDR', score: 96 },
        battery: { value: 'Up to 18 hours', score: 94 },
        graphics: { value: 'Integrated GPU', score: 88 },
      },
      rating: 4.8,
    },
    {
      id: 'dell-xps-15',
      name: 'Dell XPS 15',
      brand: 'Dell',
      price: 149990,
      displayPrice: '₹1,49,990',
      tagline: 'Windows flagship',
      specs: {
        processor: { value: 'Intel Core i7/i9 13th Gen', score: 90 },
        memory: { value: '16GB / 32GB / 64GB', score: 90 },
        storage: { value: '512GB / 1TB / 2TB SSD', score: 90 },
        display: { value: '15.6" 3.5K OLED', score: 92 },
        battery: { value: '86Wh', score: 75 },
        graphics: { value: 'RTX 4050/4060', score: 88 },
      },
      rating: 4.5,
    },
    {
      id: 'thinkpad-x1-carbon',
      name: 'Lenovo ThinkPad X1 Carbon',
      brand: 'Lenovo',
      price: 155000,
      displayPrice: '₹1,55,000',
      tagline: 'Business elite',
      specs: {
        processor: { value: 'Intel Core i7 13th Gen', score: 88 },
        memory: { value: '16GB / 32GB LPDDR5', score: 88 },
        storage: { value: '512GB / 1TB SSD', score: 88 },
        display: { value: '14" 2.8K OLED', score: 90 },
        battery: { value: '57Wh', score: 82 },
        graphics: { value: 'Intel Iris Xe', score: 75 },
      },
      rating: 4.6,
    },
  ],
  accessories: [
    {
      id: 'airpods-pro-2',
      name: 'AirPods Pro (2nd Gen)',
      brand: 'Apple',
      price: 26900,
      displayPrice: '₹26,900',
      category: 'Audio',
    },
    {
      id: 'sony-wh-1000xm5',
      name: 'Sony WH-1000XM5',
      brand: 'Sony',
      price: 29990,
      displayPrice: '₹29,990',
      category: 'Audio',
    },
    {
      id: 'samsung-wireless-charger',
      name: 'Samsung 15W Wireless Charger',
      brand: 'Samsung',
      price: 3499,
      displayPrice: '₹3,499',
      category: 'Charging',
    },
    {
      id: 'anker-powerbank',
      name: 'Anker 20000mAh Power Bank',
      brand: 'Anker',
      price: 2499,
      displayPrice: '₹2,499',
      category: 'Power',
    },
  ],
};

const categories = [
  { id: 'mobilePhones', name: 'Mobile Phones', icon: 'smartphone' },
  { id: 'laptops', name: 'Laptops', icon: 'laptop' },
  { id: 'accessories', name: 'Accessories', icon: 'headphones' },
];

const priceRanges = [
  { id: 'under-30k', label: 'Under ₹30,000', min: 0, max: 30000 },
  { id: '30k-50k', label: '₹30,000 - ₹50,000', min: 30000, max: 50000 },
  { id: '50k-80k', label: '₹50,000 - ₹80,000', min: 50000, max: 80000 },
  { id: '80k-1l', label: '₹80,000 - ₹1,00,000', min: 80000, max: 100000 },
  { id: 'above-1l', label: 'Above ₹1,00,000', min: 100000, max: null },
];

const priorityFeatures = [
  { id: 'camera', label: 'Camera', icon: 'camera' },
  { id: 'battery', label: 'Battery Life', icon: 'battery' },
  { id: 'performance', label: 'Performance', icon: 'cpu' },
  { id: 'display', label: 'Display Quality', icon: 'monitor' },
  { id: 'charging', label: 'Fast Charging', icon: 'zap' },
  { id: '5g', label: '5G Support', icon: 'signal' },
  { id: 'gaming', label: 'Gaming', icon: 'gamepad' },
];

/**
 * GET /api/products
 * Get all products or filter by category
 */
router.get('/', (req, res) => {
  try {
    const { category, minPrice, maxPrice, features, search } = req.query;

    let products = [];

    if (category && productsDatabase[category]) {
      products = productsDatabase[category];
    } else {
      // Return all products
      products = Object.values(productsDatabase).flat();
    }

    // Apply price filter
    if (minPrice || maxPrice) {
      const min = parseInt(minPrice, 10) || 0;
      const max = parseInt(maxPrice, 10) || Infinity;
      products = products.filter(p => p.price >= min && p.price <= max);
    }

    // Apply features filter
    if (features) {
      const featureList = features.split(',');
      products = products.filter(p =>
        featureList.some(f => p.features?.includes(f))
      );
    }

    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.brand.toLowerCase().includes(searchLower) ||
        p.tagline?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      success: true,
      products,
      count: products.length,
      filters: {
        category,
        minPrice,
        maxPrice,
        features,
        search,
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Failed to get products',
      message: error.message,
    });
  }
});

/**
 * GET /api/products/categories
 * Get product categories
 */
router.get('/categories', (req, res) => {
  try {
    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      message: error.message,
    });
  }
});

/**
 * GET /api/products/price-ranges
 * Get price ranges
 */
router.get('/price-ranges', (req, res) => {
  try {
    res.json({
      success: true,
      priceRanges,
    });
  } catch (error) {
    console.error('Get price ranges error:', error);
    res.status(500).json({
      error: 'Failed to get price ranges',
      message: error.message,
    });
  }
});

/**
 * GET /api/products/features
 * Get priority features
 */
router.get('/features', (req, res) => {
  try {
    res.json({
      success: true,
      features: priorityFeatures,
    });
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({
      error: 'Failed to get features',
      message: error.message,
    });
  }
});

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const allProducts = Object.values(productsDatabase).flat();
    const product = allProducts.find(p => p.id === id);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        id,
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      error: 'Failed to get product',
      message: error.message,
    });
  }
});

/**
 * POST /api/products/compare
 * Compare multiple products
 */
router.post('/compare', (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length < 2) {
      return res.status(400).json({
        error: 'At least 2 product IDs are required for comparison',
      });
    }

    const allProducts = Object.values(productsDatabase).flat();
    const productsToCompare = ids.map(id =>
      allProducts.find(p => p.id === id)
    ).filter(Boolean);

    if (productsToCompare.length !== ids.length) {
      return res.status(404).json({
        error: 'Some products were not found',
        requested: ids,
        found: productsToCompare.map(p => p.id),
      });
    }

    // Generate comparison data
    const comparison = {
      products: productsToCompare,
      highlights: productsToCompare.map(p => ({
        id: p.id,
        name: p.name,
        bestFor: getBestFor(p),
      })),
    };

    res.json({
      success: true,
      comparison,
    });
  } catch (error) {
    console.error('Compare products error:', error);
    res.status(500).json({
      error: 'Failed to compare products',
      message: error.message,
    });
  }
});

/**
 * POST /api/products/recommendations
 * Get product recommendations based on preferences
 */
router.post('/recommendations', (req, res) => {
  try {
    const { category, budget, priorities, brand } = req.body;

    let products = category && productsDatabase[category]
      ? [...productsDatabase[category]]
      : Object.values(productsDatabase).flat();

    // Filter by budget
    if (budget) {
      if (budget.min !== undefined) {
        products = products.filter(p => p.price >= budget.min);
      }
      if (budget.max !== undefined) {
        products = products.filter(p => p.price <= budget.max);
      }
    }

    // Filter by brand
    if (brand) {
      products = products.filter(p =>
        p.brand.toLowerCase() === brand.toLowerCase()
      );
    }

    // Sort by priorities
    if (priorities && priorities.length > 0) {
      products.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        for (const priority of priorities) {
          if (a.features?.includes(priority)) scoreA += 10;
          if (b.features?.includes(priority)) scoreB += 10;

          // Add spec scores if available
          if (a.specs?.[priority]?.score) {
            scoreA += a.specs[priority].score;
          }
          if (b.specs?.[priority]?.score) {
            scoreB += b.specs[priority].score;
          }
        }

        return scoreB - scoreA;
      });
    }

    // Return top 4 recommendations
    const recommendations = products.slice(0, 4);

    res.json({
      success: true,
      recommendations,
      totalMatches: products.length,
      filters: { category, budget, priorities, brand },
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message,
    });
  }
});

// Helper function to determine what a product is best for
function getBestFor(product) {
  const scores = {};

  if (product.specs) {
    for (const [key, value] of Object.entries(product.specs)) {
      scores[key] = value.score || 0;
    }
  }

  const bestSpec = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  if (bestSpec) {
    const specMap = {
      camera: 'Photography',
      battery: 'Battery Life',
      processor: 'Performance',
      display: 'Media Consumption',
      memory: 'Multitasking',
      charging: 'Fast Charging',
      graphics: 'Gaming',
    };
    return specMap[bestSpec[0]] || bestSpec[0];
  }

  return 'Overall Use';
}

export default router;

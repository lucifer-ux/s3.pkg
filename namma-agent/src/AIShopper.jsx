import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { QrCode, Mic, Send, Camera, Battery, Gamepad2, Signal, Bot, X, ChevronLeft, Check, Volume2 } from 'lucide-react';
import QRScannerModal from './QRScannerModal';
import ProductRecommendations from './ProductRecommendations';
import PaymentOptions from './PaymentOptions';
import './AIShopper.css';
import productsData from '../products.json';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ===== FIRST MESSAGE PARSER =====

/**
 * Parse user's first message to extract shopping requirements
 * Returns: { hasDeviceType, hasPrice, hasFeatures, deviceType, priceRange, features }
 */
const parseFirstMessage = (text) => {
  const lowerText = text.toLowerCase();

  // Detect device type
  const devicePatterns = {
    smartphone: ['smartphone', 'smart phone', 'mobile', 'phone', 'android', 'iphone'],
    feature_phone: ['feature phone', 'basic phone', 'keypad phone'],
    tablet: ['tablet', 'ipad', 'tab'],
    accessories: ['accessories', 'case', 'charger', 'headphone', 'earphone', 'cover'],
  };

  let detectedDeviceType = null;
  for (const [deviceType, keywords] of Object.entries(devicePatterns)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      detectedDeviceType = deviceType;
      break;
    }
  }

  // Detect price range
  const pricePatterns = [
    { range: { id: 'under10k', label: 'Under ₹10k', min: 0, max: 10000 }, regex: /under\s*10k|under\s*10000|below\s*10k|below\s*10000|within\s*10k|within\s*10000|less than\s*10k|less than\s*10000/i },
    { range: { id: '10k-20k', label: '₹10k – ₹20k', min: 10000, max: 20000 }, regex: /10k-20k|10000-20000|10k\s*to\s*20k|10000\s*to\s*20000|between\s*10k\s*and\s*20k|between\s*10000\s*and\s*20000/i },
    { range: { id: '20k-30k', label: '₹20k – ₹30k', min: 20000, max: 30000 }, regex: /20k-30k|20000-30000|20k\s*to\s*30k|20000\s*to\s*30000|between\s*20k\s*and\s*30k/i },
    { range: { id: '20k-40k', label: '₹20k – ₹40k', min: 20000, max: 40000 }, regex: /20k-40k|20000-40000|20k\s*to\s*40k|20000\s*to\s*40000|between\s*20k\s*and\s*40k/i },
    { range: { id: '30k-50k', label: '₹30k – ₹50k', min: 30000, max: 50000 }, regex: /30k-50k|30000-50000|30k\s*to\s*50k|30000\s*to\s*50000/i },
    { range: { id: '40k+', label: '₹40k+', min: 40000, max: null }, regex: /40k\+|40000\+|above\s*40k|above\s*40000|over\s*40k|over\s*40000/i },
  ];

  let detectedPriceRange = null;
  for (const pattern of pricePatterns) {
    if (pattern.regex.test(lowerText)) {
      detectedPriceRange = pattern.range;
      break;
    }
  }

  // If no explicit range, try to detect single price mentions
  if (!detectedPriceRange) {
    const singlePriceMatch = lowerText.match(/(\d+)k/i) || lowerText.match(/(\d{4,5})/);
    if (singlePriceMatch) {
      const price = parseInt(singlePriceMatch[1]) * (singlePriceMatch[0].includes('k') ? 1000 : 1);
      if (price <= 15000) {
        detectedPriceRange = { id: '10k-20k', label: '₹10k – ₹20k', min: 10000, max: 20000 };
      } else if (price <= 25000) {
        detectedPriceRange = { id: '20k-30k', label: '₹20k – ₹30k', min: 20000, max: 30000 };
      } else if (price <= 35000) {
        detectedPriceRange = { id: '20k-40k', label: '₹20k – ₹40k', min: 20000, max: 40000 };
      } else {
        detectedPriceRange = { id: '40k+', label: '₹40k+', min: 40000, max: null };
      }
    }
  }

  // Detect priority features
  const featurePatterns = {
    camera: ['camera', 'photo', 'selfie', 'photography', 'megapixel', 'mp', 'portrait', 'zoom'],
    battery: ['battery', 'charge', 'long lasting', 'power', 'mah', 'backup'],
    gaming: ['gaming', 'game', 'fps', 'pubg', 'bgmi', 'call of duty', 'gamer'],
    '5g': ['5g', '5 g', 'fifth generation', 'fast internet'],
  };

  const detectedFeatures = [];
  for (const [feature, keywords] of Object.entries(featurePatterns)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      detectedFeatures.push(feature);
    }
  }

  return {
    hasDeviceType: !!detectedDeviceType,
    hasPrice: !!detectedPriceRange,
    hasFeatures: detectedFeatures.length > 0,
    deviceType: detectedDeviceType,
    priceRange: detectedPriceRange,
    features: detectedFeatures,
    // Determine what's missing for follow-up
    missingInfo: !detectedDeviceType ? 'device_type' :
                 !detectedPriceRange ? 'price_range' :
                 detectedFeatures.length === 0 ? 'features' : null,
  };
};

// ===== PRODUCT FILTERING & MATCHING ENGINE =====

/**
 * Parse user requirements from conversation context
 */
const parseUserRequirements = (messages, selectedPrice, selectedFeatures) => {
  const requirements = {
    minPrice: selectedPrice?.min || 0,
    maxPrice: selectedPrice?.max || Infinity,
    features: selectedFeatures || [],
    keywords: []
  };

  // Extract keywords from user messages
  const userTexts = messages
    .filter(m => m.sender === 'user')
    .map(m => m.text.toLowerCase());

  const allText = userTexts.join(' ');

  // Detect feature priorities from natural language
  if (allText.includes('camera') || allText.includes('photo') || allText.includes('selfie')) {
    requirements.keywords.push('camera');
  }
  if (allText.includes('battery') || allText.includes('charge') || allText.includes('last')) {
    requirements.keywords.push('battery');
  }
  if (allText.includes('game') || allText.includes('gaming') || allText.includes('fps')) {
    requirements.keywords.push('gaming');
  }
  if (allText.includes('5g') || allText.includes('network')) {
    requirements.keywords.push('5g');
  }
  if (allText.includes('display') || allText.includes('screen') || allText.includes('amoled')) {
    requirements.keywords.push('display');
  }

  return requirements;
};

/**
 * Calculate spec match score for a product based on user requirements
 */
const calculateSpecMatchScore = (product, requirements) => {
  let score = 0;
  let maxScore = 0;

  const keywords = requirements.keywords;

  // Camera scoring (up to 25 points)
  if (keywords.includes('camera')) {
    maxScore += 25;
    const mainCamera = product.camera?.rear?.[0]?.megapixels || 0;
    if (mainCamera >= 200) score += 25;
    else if (mainCamera >= 108) score += 22;
    else if (mainCamera >= 64) score += 18;
    else if (mainCamera >= 50) score += 15;
    else if (mainCamera >= 48) score += 12;
    else score += Math.min(mainCamera / 4, 10);

    // Bonus for multiple cameras
    if (product.camera?.rear?.length >= 3) score += 5;
    // Bonus for telephoto
    if (product.camera?.rear?.some(c => c.type?.toLowerCase().includes('telephoto'))) score += 5;
  }

  // Battery scoring (up to 25 points)
  if (keywords.includes('battery')) {
    maxScore += 25;
    const capacity = product.battery?.capacity_mAh || 0;
    if (capacity >= 5500) score += 25;
    else if (capacity >= 5000) score += 22;
    else if (capacity >= 4500) score += 18;
    else if (capacity >= 4000) score += 14;
    else score += Math.max(0, (capacity - 3000) / 40);

    // Bonus for fast charging
    const charging = product.battery?.charging?.toLowerCase() || '';
    if (charging.includes('120w')) score += 5;
    else if (charging.includes('100w')) score += 4;
    else if (charging.includes('80w')) score += 3;
    else if (charging.includes('65w') || charging.includes('67w')) score += 2;
  }

  // Gaming performance scoring (up to 25 points)
  if (keywords.includes('gaming')) {
    maxScore += 25;
    const chipset = product.processor?.chipset?.toLowerCase() || '';
    const ram = parseInt(product.memory?.ram) || 0;
    const refreshRate = product.display?.refresh_rate_hz || 60;

    // Processor score
    if (chipset.includes('a17') || chipset.includes('a18')) score += 15;
    else if (chipset.includes('snapdragon 8 gen 3')) score += 15;
    else if (chipset.includes('snapdragon 8 gen 2')) score += 13;
    else if (chipset.includes('snapdragon 8')) score += 12;
    else if (chipset.includes('dimensity 9300')) score += 14;
    else if (chipset.includes('dimensity 9200')) score += 12;
    else if (chipset.includes('dimensity 9000')) score += 10;
    else if (chipset.includes('a16')) score += 12;
    else if (chipset.includes('a15')) score += 10;
    else score += 5;

    // RAM score
    if (ram >= 16) score += 5;
    else if (ram >= 12) score += 4;
    else if (ram >= 8) score += 3;
    else score += 1;

    // Refresh rate score
    if (refreshRate >= 165) score += 5;
    else if (refreshRate >= 144) score += 4;
    else if (refreshRate >= 120) score += 3;
    else score += 1;
  }

  // 5G support scoring (up to 15 points)
  if (keywords.includes('5g')) {
    maxScore += 15;
    const connectivity = product.connectivity || [];
    if (connectivity.some(c => c.toLowerCase().includes('5g'))) {
      score += 15;
    }
  }

  // Display quality scoring (up to 20 points)
  if (keywords.includes('display')) {
    maxScore += 20;
    const displayType = product.display?.type?.toLowerCase() || '';
    const refreshRate = product.display?.refresh_rate_hz || 60;
    const resolution = product.display?.resolution?.toLowerCase() || '';

    if (displayType.includes('amoled') || displayType.includes('oled')) score += 10;
    else if (displayType.includes('ltpo')) score += 12;
    else score += 5;

    if (refreshRate >= 144) score += 5;
    else if (refreshRate >= 120) score += 4;
    else if (refreshRate >= 90) score += 2;

    if (resolution.includes('3200') || resolution.includes('3088') || resolution.includes('2796')) score += 5;
    else if (resolution.includes('2800') || resolution.includes('2856') || resolution.includes('2556')) score += 4;
    else score += 2;
  }

  // Base score for products without specific feature requirements
  if (maxScore === 0) {
    // Give points for overall balanced specs
    const camera = product.camera?.rear?.[0]?.megapixels || 0;
    const battery = product.battery?.capacity_mAh || 0;
    const chipset = product.processor?.chipset?.toLowerCase() || '';
    const ram = parseInt(product.memory?.ram) || 0;

    if (camera >= 50) score += 5;
    if (battery >= 4500) score += 5;
    if (chipset.includes('snapdragon 8') || chipset.includes('a17') || chipset.includes('a16') || chipset.includes('dimensity 9')) score += 5;
    if (ram >= 8) score += 5;

    maxScore = 20;
  }

  return { score, maxScore, percentage: maxScore > 0 ? (score / maxScore) * 100 : 0 };
};

/**
 * Get product price from SKU
 */
const getProductPrice = (product) => {
  return product.skus?.[0]?.price?.selling_price ||
         product.skus?.[0]?.price?.mrp ||
         0;
};

/**
 * Check if product is within price range
 */
const isWithinPriceRange = (product, minPrice, maxPrice) => {
  const price = getProductPrice(product);
  return price >= minPrice && (maxPrice === null || price <= maxPrice);
};

/**
 * Find products matching user requirements
 * Returns: { matched: [], noResultsReason: string, nearestPrice: { lower: product, higher: product } }
 */
const findMatchingProducts = (requirements, products = productsData) => {
  const { minPrice, maxPrice, keywords } = requirements;

  // Filter by category (smartphones only for now)
  let candidates = products.filter(p => p.category === 'Smartphones');

  if (candidates.length === 0) {
    return {
      matched: [],
      noResultsReason: 'NO_DEVICES_IN_CATEGORY',
      nearestPrice: null,
      allProducts: []
    };
  }

  // Check if any products exist in the price range
  const productsInPriceRange = candidates.filter(p => isWithinPriceRange(p, minPrice, maxPrice));

  // Calculate spec scores for all products
  const scoredProducts = candidates.map(product => {
    const specScore = calculateSpecMatchScore(product, requirements);
    const price = getProductPrice(product);
    return {
      product,
      price,
      specScore,
      inPriceRange: price >= minPrice && (maxPrice === null || price <= maxPrice)
    };
  });

  // If no products in price range, find nearest price options
  if (productsInPriceRange.length === 0) {
    const lowerPriced = scoredProducts.filter(p => p.price < minPrice).sort((a, b) => b.price - a.price);
    const higherPriced = scoredProducts.filter(p => p.price > (maxPrice || Infinity)).sort((a, b) => a.price - b.price);

    return {
      matched: [],
      noResultsReason: 'NO_DEVICES_IN_PRICE_RANGE',
      nearestPrice: {
        lower: lowerPriced[0]?.product || null,
        higher: higherPriced[0]?.product || null
      },
      allProducts: scoredProducts
    };
  }

  // Filter to products in price range and sort by spec match score
  const matched = scoredProducts
    .filter(p => p.inPriceRange)
    .sort((a, b) => b.specScore.percentage - a.specScore.percentage);

  // If we have feature requirements but no good matches, return partial matches
  if (keywords.length > 0 && matched.every(m => m.specScore.percentage < 30)) {
    return {
      matched: matched.slice(0, 4),
      noResultsReason: 'NO_DEVICES_MATCH_SPECS',
      nearestPrice: null,
      allProducts: scoredProducts,
      partialMatch: true
    };
  }

  return {
    matched: matched.slice(0, 4),
    noResultsReason: null,
    nearestPrice: null,
    allProducts: scoredProducts
  };
};

/**
 * Find pro/upgrade variant with smart price proximity check
 * Only returns a pro variant if it's within reasonable upgrade price range (15-25% more)
 */
const findSmartProVariant = (currentProduct, allProducts = productsData) => {
  const currentPrice = getProductPrice(currentProduct);
  const baseName = currentProduct.name.split(' ').slice(0, 2).join(' ');

  // Define upgrade price range (15% to 35% more expensive)
  const minUpgradePrice = currentPrice * 1.15;
  const maxUpgradePrice = currentPrice * 1.50;

  // Find potential upgrades
  const upgrades = allProducts.filter(p => {
    const price = getProductPrice(p);
    const isSameLineup = p.name.includes(baseName) || isRelatedModel(currentProduct, p);
    const isPriceValid = price >= minUpgradePrice && price <= maxUpgradePrice;
    const isHigherTier = isHigherTierModel(currentProduct, p);

    return p.product_id !== currentProduct.product_id &&
           p.category === 'Smartphones' &&
           (isSameLineup || isHigherTier) &&
           isPriceValid;
  });

  if (upgrades.length === 0) return null;

  // Sort by price and return the best value upgrade
  return upgrades.sort((a, b) => {
    const priceA = getProductPrice(a);
    const priceB = getProductPrice(b);
    // Prefer upgrades closer to the minimum upgrade price (better value)
    return Math.abs(priceA - minUpgradePrice) - Math.abs(priceB - minUpgradePrice);
  })[0];
};

/**
 * Check if two products are related models (same brand, similar naming)
 */
const isRelatedModel = (productA, productB) => {
  if (productA.brand !== productB.brand) return false;

  const nameA = productA.name.toLowerCase();
  const nameB = productB.name.toLowerCase();

  // Check for series patterns (e.g., Galaxy S24 and Galaxy S24 Ultra)
  const seriesPatterns = [
    /galaxy s(\d+)/, /iphone (\d+)/, /pixel (\d+)/,
    /oneplus (\d+)/, /xiaomi (\d+)/, /nothing phone \((\d+)/
  ];

  for (const pattern of seriesPatterns) {
    const matchA = nameA.match(pattern);
    const matchB = nameB.match(pattern);
    if (matchA && matchB && matchA[1] === matchB[1]) {
      return true;
    }
  }

  return false;
};

/**
 * Determine if productB is a higher tier model than productA
 */
const isHigherTierModel = (productA, productB) => {
  const nameA = productA.name.toLowerCase();
  const nameB = productB.name.toLowerCase();

  // Check for Pro/Ultra/Plus/Max variants
  const tierKeywords = ['pro max', 'ultra', 'pro', 'plus', 'max', '+'];
  const hasHigherTier = tierKeywords.some(kw => nameB.includes(kw) && !nameA.includes(kw));

  // Check for higher storage
  const storageA = productA.skus?.[0]?.storage || '';
  const storageB = productB.skus?.[0]?.storage || '';
  const storageNumA = parseInt(storageA);
  const storageNumB = parseInt(storageB);

  return hasHigherTier || (storageNumB > storageNumA);
};

/**
 * Format price with currency
 */
const formatPrice = (price, currency = 'INR') => {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${price.toLocaleString('en-IN')}`;
};
// Conversation flow steps
const CONVERSATION_STEPS = [
  'initial',           // Welcome, understand what user wants
  'category',          // Determine product category (phones, laptops, etc.)
  'budget_range',      // Understand budget constraints
  'features',          // Identify important features/priorities
  'recommendations',   // Show product recommendations
  'comparison',        // Compare selected products
  'payment_options'    // Show payment/EMI options
];

// API client for chat
const chatApi = {
  async sendMessage(messages) {
    console.log("Sending messages to API:", messages);
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw new Error('Failed to get response');
    return response.json();
  },

  async *streamMessage(messages, conversationStep = 'initial') {
    console.log("Streaming messages to API:", messages, "Step:", conversationStep);
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        conversationStep,
        availableSteps: CONVERSATION_STEPS
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let recommendations = null;
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            // Yield final result with recommendations (content already streamed)
            yield { done: true, recommendations };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              yield { content: parsed.content };
            }
            if (parsed.done) {
              recommendations = parsed.recommendations;
              // Don't use parsed.fullContent - we already accumulated all chunks
            }
            // Include nextStep if provided by AI
            if (parsed.nextStep) {
              yield { nextStep: parsed.nextStep };
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
  }
};

function AIShopper({ onProductSelect }) {
  // Unique ID counter to prevent duplicate keys
  const idCounterRef = useRef(0);
  const generateId = () => {
    idCounterRef.current += 1;
    return `${Date.now()}-${idCounterRef.current}`;
  };

  const [inputValue, setInputValue] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoicePopupOpen, setIsVoicePopupOpen] = useState(false);
  const [voiceAiResponse, setVoiceAiResponse] = useState('');
  // Load conversation step from localStorage
  const [isVoiceMode, setIsVoiceMode] = useState(false); // Track if user is in voice conversation mode
  const [awaitingResponse, setAwaitingResponse] = useState(null); // 'device_type', 'price_range', etc.
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [cartCount] = useState(2);
  const [conversationStep, setConversationStep] = useState(() => {
    const saved = localStorage.getItem('conversationStep');
    return saved || 'initial';
  });
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [purchaseProduct, setPurchaseProduct] = useState(null);
  const [isEarphoneEnabled, setIsEarphoneEnabled] = useState(false);

  // Inline voice states - replaces VoicePopup
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isVoiceSpeaking, setIsVoiceSpeaking] = useState(false);
  const [voiceAudioLevels, setVoiceAudioLevels] = useState(new Array(5).fill(0));

  const audioRef = useRef(null);
  const lastDoubleTapRef = useRef(0);

  // Voice refs
  const voiceAudioRef = useRef(null);
  const voiceAudioContextRef = useRef(null);
  const voiceAnalyserRef = useRef(null);
  const voiceAnimationFrameRef = useRef(null);
  const voiceRecognitionRef = useRef(null);
  const lastSpokenResponseRef = useRef('');
  const isVoiceListeningRef = useRef(isVoiceListening);

  // Keep refs in sync with state
  useEffect(() => {
    isVoiceListeningRef.current = isVoiceListening;
  }, [isVoiceListening]);

  // Filtered product recommendations based on user requirements
  const [filteredRecommendations, setFilteredRecommendations] = useState([]);
  const [filterStatus, setFilterStatus] = useState(null); // { noResultsReason, nearestPrice, message }

  // Load apiRecommendations from localStorage on mount
  const [apiRecommendations, setApiRecommendations] = useState(() => {
    const saved = localStorage.getItem('apiRecommendations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved recommendations:', e);
      }
    }
    return [];
  });

  // Load messages from localStorage on mount
  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages);
      } catch (e) {
        console.error('Failed to parse saved messages:', e);
      }
    }
    // Default welcome message if no saved messages
    return [
      {
        id: 'welcome',
        text: "What are you looking to buy today?",
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isWelcome: true,
      }
    ];
  });

  const messagesEndRef = useRef(null);
  const messagesRef = useRef(messages);

  // Keep messagesRef in sync with state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Earphone controls setup
  const enableEarphoneControls = async () => {
    try {
      const audio = new Audio('/silent.mp3');
      audio.loop = true;

      // IMPORTANT: macOS ignores near-zero volume
      audio.volume = 0.2;

      await audio.play();

      audioRef.current = audio;
      setIsEarphoneEnabled(true);

      setupMediaSession();

    } catch (err) {
      console.error('Failed to start audio:', err);
    }
  };

  const setupMediaSession = () => {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API NOT supported');
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'AI Shopper',
      artist: 'ShopAI',
    });

    navigator.mediaSession.playbackState = 'playing';

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('Earphone single tap detected');
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('Earphone pause detected');
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        const now = Date.now();
        const timeSinceLastTap = now - lastDoubleTapRef.current;

        // Debounce: ignore if less than 500ms since last tap
        if (timeSinceLastTap < 500) {
          return;
        }
        lastDoubleTapRef.current = now;

        console.log('Earphone double tap detected - toggling voice listening');
        // Toggle voice listening
        if (isVoiceListeningRef.current) {
          stopVoiceListening();
        } else {
          startVoiceListening();
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        console.log('Earphone triple tap detected');
      });
    } catch (e) {
      console.warn('Media action not supported:', e);
    }
  };

  // Auto-recover audio if browser pauses it
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && audioRef.current) {
        try {
          await audioRef.current.play();
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  // Keep forcing audio alive (macOS workaround)
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  // Save conversation step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('conversationStep', conversationStep);
  }, [conversationStep]);

  // Save apiRecommendations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('apiRecommendations', JSON.stringify(apiRecommendations));
  }, [apiRecommendations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const categories = [
    { id: 1, name: 'Mobile phones' },
    { id: 2, name: 'Laptops' },
    { id: 3, name: 'Accessories' },
  ];

  const priceRanges = [
    { id: '10k-20k', label: '₹10k – ₹20k', min: 10000, max: 20000 },
    { id: '20k-40k', label: '₹20k – ₹40k', min: 20000, max: 40000 },
    { id: '40k+', label: '₹40k+', min: 40000, max: null },
  ];

  const priorityFeatures = [
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'battery', label: 'Battery', icon: Battery },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: '5g', label: '5G Support', icon: Signal },
  ];

  const deviceTypes = [
    { id: 'smartphone', label: 'Smartphone', icon: '📱', description: 'Latest smartphones with advanced features' },
    { id: 'feature_phone', label: 'Feature Phone', icon: '📞', description: 'Basic phones with long battery life' },
    { id: 'tablet', label: 'Tablet', icon: '📟', description: 'Large screen devices for media and work' },
    { id: 'accessories', label: 'Accessories', icon: '🎧', description: 'Cases, chargers, headphones & more' },
  ];

  const handleCategoryClick = (category) => {
    // When category is clicked, start the flow
    setConversationStep('awaiting_price');
    handleSendMessage(category, true);
  };

  const handleSendMessage = async (text, isInitial = false) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    const lowerText = messageText.trim().toLowerCase();

    // Check if user wants to select/buy a specific product (must have product name with at least 2 words or a model number)
    const selectMatch = lowerText.match(/^(?:select|choose)\s+(?:this|the)?\s*(.+)$/i);
    if (selectMatch && apiRecommendations.length > 0) {
      const productName = selectMatch[1].trim().toLowerCase();

      // Require at least 2 words OR a model number (digits) to avoid matching generic phrases like "this one"
      const hasModelNumber = /\d/.test(productName);
      const wordCount = productName.split(/\s+/).length;
      if (wordCount < 2 && !hasModelNumber) {
        console.log('Select match rejected - too generic:', productName);
      } else {
      console.log('Select match:', productName, 'words:', wordCount, 'hasNumber:', hasModelNumber);

      // Find best matching product
      let bestMatch = null;
      let bestScore = 0;

      for (const product of apiRecommendations) {
        const productNameLower = (product.name || '').toLowerCase();
        const searchWords = productName.split(/\s+/).filter(w => w.length > 1);

        let score = 0;
        if (productNameLower === productName) {
          score = 1000;
        } else if (productNameLower.includes(productName)) {
          score = 500 + productName.length;
        } else if (productName.includes(productNameLower)) {
          score = 300 + productNameLower.length;
        } else {
          for (const word of searchWords) {
            if (productNameLower.includes(word)) {
              score += 50;
              if (/\d/.test(word)) score += 100;
            }
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = product;
        }
      }

      console.log('Best select match:', bestMatch, 'score:', bestScore);

      if (bestMatch && bestScore > 50) {
        // Add user message
        const userMessage = {
          id: generateId(),
          text: messageText,
          sender: 'user',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');

        // Trigger purchase flow
        // Look up full product details from productsData
        const fullProduct = productsData.find(p => p.product_id === bestMatch.product_id);
        console.log(fullProduct);
        if (fullProduct) {
          console.log({
            id: fullProduct.product_id,
            name: fullProduct.name,
            shortName: fullProduct.name?.split(' ').slice(0, 3).join(' ') || fullProduct.name,
            image: fullProduct.assets?.main_image?.url_medium || fullProduct.images?.[0] || '/placeholder.png',
            price: fullProduct.skus?.[0]?.price?.selling_price || 0,
            priceDisplay: fullProduct.skus?.[0]?.price
              ? `₹${fullProduct.skus[0].price.selling_price?.toLocaleString()}`
              : '',
            specs: {
              battery: { value: fullProduct.battery?.capacity_mAh ? `${fullProduct.battery.capacity_mAh} mAh` : 'N/A', score: fullProduct.battery?.capacity_mAh ? Math.min(fullProduct.battery.capacity_mAh / 60, 100) : 50 },
              display: { value: fullProduct.display?.size_inches ? `${fullProduct.display.size_inches}" ${fullProduct.display.type}` : 'N/A', score: fullProduct.display?.size_inches ? Math.min(fullProduct.display.size_inches * 12, 100) : 70 },
              camera: { value: fullProduct.camera?.rear?.[0]?.megapixels ? `${fullProduct.camera.rear[0].megapixels}MP` : 'N/A', score: fullProduct.camera?.rear?.[0]?.megapixels ? Math.min(fullProduct.camera.rear[0].megapixels / 2.5, 100) : 70 },
              ram: { value: fullProduct.memory?.ram || 'N/A', score: fullProduct.memory?.ram ? parseInt(fullProduct.memory.ram) * 5 : 60 },
              processor: { value: fullProduct.processor?.chipset || 'N/A', score: fullProduct.processor?.chipset?.includes('A17') || fullProduct.processor?.chipset?.includes('Snapdragon 8') ? 95 : 80 },
            },
          });
          handleSelectDeviceForPurchase({
            id: fullProduct.product_id,
            name: fullProduct.name,
            shortName: fullProduct.name?.split(' ').slice(0, 3).join(' ') || fullProduct.name,
            image: fullProduct.assets?.main_image?.url_medium || fullProduct.images?.[0] || '/placeholder.png',
            price: fullProduct.skus?.[0]?.price?.selling_price || 0,
            priceDisplay: fullProduct.skus?.[0]?.price
              ? `₹${fullProduct.skus[0].price.selling_price?.toLocaleString()}`
              : '',
            specs: {
              battery: { value: fullProduct.battery?.capacity_mAh ? `${fullProduct.battery.capacity_mAh} mAh` : 'N/A', score: fullProduct.battery?.capacity_mAh ? Math.min(fullProduct.battery.capacity_mAh / 60, 100) : 50 },
              display: { value: fullProduct.display?.size_inches ? `${fullProduct.display.size_inches}" ${fullProduct.display.type}` : 'N/A', score: fullProduct.display?.size_inches ? Math.min(fullProduct.display.size_inches * 12, 100) : 70 },
              camera: { value: fullProduct.camera?.rear?.[0]?.megapixels ? `${fullProduct.camera.rear[0].megapixels}MP` : 'N/A', score: fullProduct.camera?.rear?.[0]?.megapixels ? Math.min(fullProduct.camera.rear[0].megapixels / 2.5, 100) : 70 },
              ram: { value: fullProduct.memory?.ram || 'N/A', score: fullProduct.memory?.ram ? parseInt(fullProduct.memory.ram) * 5 : 60 },
              processor: { value: fullProduct.processor?.chipset || 'N/A', score: fullProduct.processor?.chipset?.includes('A17') || fullProduct.processor?.chipset?.includes('Snapdragon 8') ? 95 : 80 },
            },
          });
        } else {
          // Fallback to api data with N/A specs
          handleSelectDeviceForPurchase({
            id: bestMatch.prid,
            name: bestMatch.name,
            shortName: bestMatch.name?.split(' ').slice(0, 3).join(' ') || bestMatch.name,
            image: bestMatch.image || '/placeholder.png',
            price: bestMatch.numericPrice || 0,
            priceDisplay: bestMatch.price || '',
            specs: {
              battery: { value: 'N/A', score: 50 },
              display: { value: 'N/A', score: 70 },
              camera: { value: 'N/A', score: 70 },
              ram: { value: 'N/A', score: 60 },
              processor: { value: 'N/A', score: 80 },
            }
          });
        }
        return;
      }
      }
    }

    // Check if user wants to compare products (handles "compare" or "campare" typo)
    const compareMatch = lowerText.match(/^(?:compare|campare)\s+(.+?)\s+(?:and|vs\.?|with)\s+(.+)$/i);
    console.log('Compare match:', compareMatch, 'messageText:', JSON.stringify(messageText), 'lowerText:', lowerText, 'apiRecommendations:', apiRecommendations.length);
    if (compareMatch && apiRecommendations.length >= 2) {
      const product1Name = compareMatch[1].trim().toLowerCase();
      const product2Name = compareMatch[2].trim().toLowerCase();
      console.log('Searching for:', product1Name, 'and', product2Name);
      console.log('Available products:', apiRecommendations.map(p => p.name));

      // Find best matching products using scoring
      const findBestMatch = (searchName) => {
        let bestMatch = null;
        let bestScore = 0;

        for (const product of apiRecommendations) {
          const productName = (product.name || product.shortName || '').toLowerCase();
          const searchWords = searchName.split(/\s+/).filter(w => w.length > 1);
          const productWords = productName.split(/\s+/).filter(w => w.length > 1);

          let score = 0;
          // Exact match gets highest score
          if (productName === searchName) {
            score = 1000;
          } else if (productName.includes(searchName)) {
            // Product contains full search term
            score = 500 + searchName.length;
          } else if (searchName.includes(productName)) {
            // Search contains full product name
            score = 300 + productName.length;
          } else {
            // Count matching words
            for (const word of searchWords) {
              if (productWords.some(pw => pw.includes(word) || word.includes(pw))) {
                score += 50;
                // Bonus for matching model numbers (contain digits)
                if (/\d/.test(word)) score += 100;
              }
            }
          }

          console.log(`  Score for "${productName}": ${score}`);

          if (score > bestScore) {
            bestScore = score;
            bestMatch = product;
          }
        }

        console.log(`Best match for "${searchName}":`, bestMatch?.name, 'score:', bestScore);
        return bestMatch;
      };

      const match1 = findBestMatch(product1Name);
      const match2 = findBestMatch(product2Name);

      console.log('Final matches:', match1?.name, 'vs', match2?.name);

      if (match1 && match2 && match1.id !== match2.id) {
        // Add user message
        const userMessage = {
          id: generateId(),
          text: messageText,
          sender: 'user',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');

        // Trigger comparison with correct product IDs
        handleCompare([match1.id, match2.id]);
        return;
      }
    }

    const userMessage = {
      id: generateId(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Check if this is the first user message (excluding welcome)
    const userMessageCount = messagesRef.current.filter(m => m.sender === 'user').length;
    const isFirstMessage = userMessageCount === 0;

    // Parse first message for smart flow
    if (isFirstMessage) {
      const parsed = parseFirstMessage(messageText);

      // If we have all the info needed, skip directly to recommendations
      if (parsed.hasDeviceType && parsed.hasPrice && parsed.hasFeatures) {
        setIsLoading(true);

        // Set the detected values
        setSelectedPrice(parsed.priceRange);
        setSelectedFeatures(parsed.features);
        setConversationStep('showing_products');

        // Build requirements and find products
        const requirements = {
          minPrice: parsed.priceRange.min,
          maxPrice: parsed.priceRange.max,
          features: parsed.features,
          keywords: parsed.features,
        };

        const result = findMatchingProducts(requirements);

        // Generate personalized message based on first feature
        const recommendations = result.matched.map(m => ({
          id: m.product.product_id,
          name: m.product.name,
          price: formatPrice(m.price, m.product.skus?.[0]?.price?.currency),
          rating: m.product.ratings?.average_rating,
          highlights: m.product.highlights,
          description: m.product.description,
          image: m.product.images?.[0],
          brand: m.product.brand,
          specMatchScore: m.specScore.percentage
        }));

        const featureId = parsed.features[0];
        const personalizedMessage = generatePersonalizedMessage(
          featureId,
          recommendations,
          parsed.priceRange,
          result.matched
        );

        // Add AI message with recommendations
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          text: personalizedMessage,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          showProducts: true,
          recommendations
        }]);

        setFilteredRecommendations(recommendations);
        setFilterStatus(result.noResultsReason ? { noResultsReason: result.noResultsReason, nearestPrice: result.nearestPrice, message: '' } : null);
        setIsLoading(false);
        return;
      }

      // We have partial info - determine what to ask for
      if (parsed.missingInfo) {
        // For text mode: show tiles asking for missing info
        // For voice mode: speak the question

        if (parsed.missingInfo === 'device_type') {
          setConversationStep('awaiting_device_type');
          setAwaitingResponse('device_type');

          // Add a brief acknowledgment from AI
          const acknowledgment = "I'd be happy to help you find the perfect device!";
          setMessages((prev) => [...prev, {
            id: Date.now() + 1,
            text: acknowledgment,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          }]);

          // If in voice mode, set the voice prompt
          if (isVoiceMode) {
            setVoiceAiResponse(getVoicePromptForCurrentStep());
          }
          return;
        }

        if (parsed.missingInfo === 'price_range') {
          setSelectedPrice(parsed.priceRange);
          setConversationStep('awaiting_price');
          setAwaitingResponse('price_range');

          // Add acknowledgment
          const acknowledgment = `Great! I see you're looking for ${parsed.deviceType === 'smartphone' ? 'a smartphone' : parsed.deviceType === 'tablet' ? 'a tablet' : 'a device'}.`;
          setMessages((prev) => [...prev, {
            id: Date.now() + 1,
            text: acknowledgment,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          }]);

          if (isVoiceMode) {
            setVoiceAiResponse(getVoicePromptForCurrentStep());
          }
          return;
        }

        if (parsed.missingInfo === 'features') {
          setSelectedPrice(parsed.priceRange);
          setConversationStep('awaiting_features');

          // Add acknowledgment
          const acknowledgment = `Perfect! I found your budget range. Now let me know what features matter most to you.`;
          setMessages((prev) => [...prev, {
            id: Date.now() + 1,
            text: acknowledgment,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          }]);

          if (isVoiceMode) {
            setVoiceAiResponse(getVoicePromptForCurrentStep());
          }
          return;
        }
      }
    }

    // Default behavior for follow-up messages or if smart flow didn't apply
    setIsLoading(true);

    try {
      // Build message history for API (only user/assistant roles, excluding welcome message)
      const apiMessages = messages
        .filter(m => (m.sender === 'user' || m.sender === 'assistant') && !m.isWelcome)
        .map(m => ({
          role: m.sender,
          content: m.text
        }));

      // Add the new user message
      apiMessages.push({
        role: 'user',
        content: messageText
      });

      // Add system instruction with conversation flow context
      const availableStepsStr = CONVERSATION_STEPS.join(', ');
      apiMessages.unshift({
        role: 'system',
        content: `You are an AI shopping assistant. Follow this conversation flow: ${availableStepsStr}. Current step: ${conversationStep}. Respond with JSON format: {"message": "your response text", "nextStep": "one of the available steps"}. Keep responses brief (1-2 sentences). Be concise and to the point. Only ask clarifying questions when truly needed.`
      });

      // Create a placeholder for the streaming response
      const aiMessageId = generateId();
      setMessages((prev) => [...prev, {
        id: aiMessageId,
        text: '',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);

      // Stream the response - pass current conversation step to API
      let fullResponse = '';
      let recommendations = null;
      let nextStep = null;

      for await (const chunk of chatApi.streamMessage(apiMessages, conversationStep)) {
        if (chunk.done) {
          // Final chunk - only capture recommendations, content already streamed
          recommendations = chunk.recommendations;
        } else if (chunk.content) {
          // Streaming chunk - accumulate content
          fullResponse += chunk.content;
        }
        if (chunk.nextStep) {
          nextStep = chunk.nextStep;
        }

        // Parse and display immediately for streaming effect
        let displayText = fullResponse;
        try {
          // Clean up markdown code blocks (handle multiline) and parse JSON
          const cleaned = fullResponse
            .replace(/^```json\s*/m, '')
            .replace(/\s*```$/m, '')
            .trim();
          const parsed = JSON.parse(cleaned);
          displayText = parsed.message || fullResponse;
          if (parsed.nextStep) {
            nextStep = parsed.nextStep;
          }
        } catch {
          // Not valid JSON yet, show as-is
        }

        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: displayText }
              : m
          )
        );
      }

      // Final parse to get clean message
      let finalMessageText = fullResponse;
      try {
        const cleaned = fullResponse
          .replace(/^```json\s*/m, '')
          .replace(/\s*```$/m, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        finalMessageText = parsed.message || fullResponse;
        if (parsed.nextStep && !nextStep) {
          nextStep = parsed.nextStep;
        }
      } catch {
        // If not valid JSON, use as-is
      }

      // Update final message with recommendations if any
      if (recommendations && recommendations.length > 0) {
        setApiRecommendations(recommendations);
        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: finalMessageText, showProducts: true, recommendations }
              : m
          )
        );
      }

      // Update conversation step based on AI response
      // Only update if different and valid, and advance to recommendations if products shown
      if (recommendations && recommendations.length > 0) {
        setConversationStep('recommendations');
      } else if (nextStep && nextStep !== conversationStep && CONVERSATION_STEPS.includes(nextStep)) {
        setConversationStep(nextStep);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, {
        id: generateId(),
        text: 'Sorry, I had trouble connecting. Please try again.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleDeviceTypeSelect = (deviceType) => {
    // Add user selection message
    const selectionText = `I'm looking for a ${deviceType.label}`;
    const selectionMessage = {
      id: generateId(),
      text: selectionText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setConversationStep('budget_range');
    setAwaitingResponse('price_range');

    // Send to AI
    sendToAI(selectionText);
  };

  const handlePriceSelect = (priceRange) => {
    // Add user selection message
    const selectionText = `My budget is ${priceRange.label}`;
    const selectionMessage = {
      id: generateId(),
      text: selectionText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setSelectedPrice(priceRange);
    // Clear awaitingResponse to hide price tiles
    setAwaitingResponse(null);
    // NO AI message - just show feature tiles directly
    setConversationStep('features');

    // Send to AI
    sendToAI(selectionText);
  };

  const handleFeatureSelect = (feature) => {
    // Track selected features
    setSelectedFeatures(prev => [...prev, feature.id]);

    // Add user selection message
    const selectionText = `I prioritize ${feature.label}`;
    const selectionMessage = {
      id: generateId(),
      text: selectionText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setConversationStep('showing_products');

    // Run intelligent product filtering
    const requirements = parseUserRequirements(
      [...messages, selectionMessage],
      selectedPrice,
      [...selectedFeatures, feature.id]
    );

    const result = findMatchingProducts(requirements);

    // Handle no results cases
    if (result.noResultsReason) {
      let noResultsMessage = '';

      switch (result.noResultsReason) {
        case 'NO_DEVICES_IN_PRICE_RANGE':
          noResultsMessage = `No devices found in your budget. Try adjusting your price range.`;
          break;

        case 'NO_DEVICES_MATCH_SPECS':
          noResultsMessage = `No exact matches. Showing closest options:`;
          break;

        case 'NO_DEVICES_IN_CATEGORY':
          noResultsMessage = `No smartphones available right now. Please check back later.`;
          break;
      }

      setFilterStatus({
        noResultsReason: result.noResultsReason,
        nearestPrice: result.nearestPrice,
        message: noResultsMessage
      });

      // Add AI message about no results - short 1-2 liner
      const showPartialResults = result.noResultsReason === 'NO_DEVICES_MATCH_SPECS' && result.matched.length > 0;
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        text: noResultsMessage,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        showProducts: showPartialResults,
        recommendations: showPartialResults ? result.matched.map(m => ({
          id: m.product.product_id,
          name: m.product.name,
          price: formatPrice(m.price, m.product.skus?.[0]?.price?.currency),
          rating: m.product.ratings?.average_rating,
          highlights: m.product.highlights,
          description: m.product.description,
          image: m.product.images?.[0],
          brand: m.product.brand
        })) : null
      }]);

      setFilteredRecommendations(result.matched.map(m => ({
        id: m.product.product_id,
        name: m.product.name,
        price: formatPrice(m.price, m.product.skus?.[0]?.price?.currency),
        rating: m.product.ratings?.average_rating,
        highlights: m.product.highlights,
        description: m.product.description,
        image: m.product.images?.[0],
        brand: m.product.brand
      })));
    } else {
      // Results found - generate personalized recommendation message
      const recommendations = result.matched.map(m => ({
        id: m.product.product_id,
        name: m.product.name,
        price: formatPrice(m.price, m.product.skus?.[0]?.price?.currency),
        rating: m.product.ratings?.average_rating,
        highlights: m.product.highlights,
        description: m.product.description,
        image: m.product.images?.[0],
        brand: m.product.brand,
        specMatchScore: m.specScore.percentage
      }));

      // Generate personalized message based on selected features
      const personalizedMessage = generatePersonalizedMessage(
        feature.id,
        recommendations,
        selectedPrice
      );

      // Add AI message with personalized recommendation
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        text: personalizedMessage,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        showProducts: true,
        recommendations
      }]);

      setFilteredRecommendations(recommendations);
      setFilterStatus(null);
    }
    // No API call - all messages are predefined
  };

  /**
   * Generate personalized recommendation message based on user's priority feature
   */
  const generatePersonalizedMessage = (featureId, recommendations, priceRange) => {
    const topPick = recommendations[0];
    const priceLabel = priceRange?.label || 'your budget';

    switch (featureId) {
      case 'battery':
        return `Here are the best battery phones in ${priceLabel}. The ${topPick.name} leads with great battery life.`;

      case 'camera':
        return `Here are the best camera phones in ${priceLabel}. The ${topPick.name} has excellent photo quality.`;

      case 'gaming':
        return `Here are the best gaming phones in ${priceLabel}. The ${topPick.name} delivers top performance.`;

      case '5g':
        return `Here are the best 5G phones in ${priceLabel}. The ${topPick.name} supports fastest connectivity.`;

      default:
        return `Here are the best phones in ${priceLabel}. The ${topPick.name} offers great value.`;
    }
  };

  const sendToAI = async (text) => {
    setIsLoading(true);

    try {
      // Build message history
      const apiMessages = messages
        .filter(m => (m.sender === 'user' || m.sender === 'assistant'))
        .map(m => ({
          role: m.sender,
          content: m.text
        }));

      // Add the selection
      apiMessages.push({
        role: 'user',
        content: text
      });

      // Create AI response placeholder
      const aiMessageId = generateId();
      setMessages((prev) => [...prev, {
        id: aiMessageId,
        text: '',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);

      // Stream the response
      let fullText = '';
      for await (const chunk of chatApi.streamMessage(apiMessages)) {
        if (chunk && typeof chunk === 'object' && chunk.content) {
          fullText += chunk.content;
        } else if (typeof chunk === 'string') {
          fullText += chunk;
        }
        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: fullText }
              : m
          )
        );
      }
    } catch (error) {
      console.error('AI send error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = (selectedIds) => {
    setSelectedProducts(selectedIds);
    setConversationStep('comparing');
    // Add comparison message to chat
    setMessages((prev) => [...prev, {
      id: generateId(),
      text: `Comparing ${selectedIds.length} phones side by side. Tap on a device to select it for purchase.`,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleSelectDeviceForPurchase = (product) => {
    setPurchaseProduct(product);
    setConversationStep('purchasing');
    // Add purchase message to chat
    setMessages((prev) => [...prev, {
      id: generateId(),
      text: `Great choice! The ${product.name} is an excellent pick. Here are the payment options:`,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleCloseComparison = () => {
    setConversationStep('showing_products');
    setSelectedProducts([]);
  };

  const handleRemoveFromComparison = (productId) => {
    setSelectedProducts((prev) => {
      const updated = prev.filter((id) => id !== productId);
      if (updated.length < 2) {
        setConversationStep('showing_products');
      }
      return updated;
    });
  };

  const handleBuyFromComparison = (product) => {
    handleSelectDeviceForPurchase(product);
  };

  const handleClosePurchase = () => {
    setConversationStep('comparing');
    setPurchaseProduct(null);
  };

  const handleFinalBuy = (product, offer) => {
    const offerText = offer ? ` with ${offer.bank} ${offer.type}` : '';
    alert(`Successfully purchased ${product.name}${offerText}!`);
    setConversationStep('initial');
    setPurchaseProduct(null);
    setSelectedProducts([]);
    setMessages((prev) => [...prev, {
      id: generateId(),
      text: `Congratulations! Your order for ${product.name}${offerText} has been placed successfully. Is there anything else I can help you with?`,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleUpgrade = (proVariant) => {
    // Convert the proVariant to the same format as purchaseProduct
    const variantPrice = getProductPrice(proVariant);
    const upgradedProduct = {
      id: proVariant.product_id,
      name: proVariant.name,
      shortName: proVariant.name.split(' ').slice(0, 3).join(' '),
      // image: proVariant.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=200&h=200&fit=crop',
      image: proVariant.images?.[0] || '/placeholder.png',
      price: variantPrice,
      priceDisplay: formatPrice(variantPrice, proVariant.skus?.[0]?.price?.currency),
      // price: proVariant.skus?.[0]?.price?.selling_price || 0,
      // priceDisplay: proVariant.skus?.[0]?.price
      //   ? `${proVariant.skus[0].price.currency === 'INR' ? '₹' : '$'}${proVariant.skus[0].price.selling_price?.toLocaleString()}`
      //   : '',
    };

    setPurchaseProduct(upgradedProduct);
    // Add upgrade message to chat
    setMessages((prev) => [...prev, {
      id: generateId(),
      text: `Great choice upgrading to ${proVariant.name}! This model has better features. Here are the payment options:`,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleOpenScanner = () => {
    setIsScannerOpen(true);
    setScannedData(null);
  };

  const handleCloseScanner = () => {
    setIsScannerOpen(false);
  };

  const handleScanSuccess = (decodedText) => {
    setScannedData(decodedText);
    handleSendMessage(`Scanned product: ${decodedText}`);
  };

  // Handle voice mode - send message and auto-read response
  const handleVoiceMode = async (transcript) => {
    if (!transcript.trim()) return;

    // Send message in background (same as regular chat)
    const userMessage = {
      id: generateId(),
      text: transcript,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const lowerText = transcript.trim().toLowerCase();

    // Check if user wants to select/buy a specific product via voice
    const selectMatch = lowerText.match(/^(?:select|choose)\s+(?:this|the)?\s*(.+)$/i);
    if (selectMatch && apiRecommendations.length > 0) {
      const productName = selectMatch[1].trim().toLowerCase();

      // Require at least 2 words OR a model number to avoid generic phrases
      const hasModelNumber = /\d/.test(productName);
      const wordCount = productName.split(/\s+/).length;
      if (wordCount >= 2 || hasModelNumber) {
        console.log('Voice select match:', productName, 'words:', wordCount, 'hasNumber:', hasModelNumber);

        // Find best matching product
        let bestMatch = null;
        let bestScore = 0;

        for (const product of apiRecommendations) {
          const productNameLower = (product.name || '').toLowerCase();
          const searchWords = productName.split(/\s+/).filter(w => w.length > 1);

          let score = 0;
          if (productNameLower === productName) {
            score = 1000;
          } else if (productNameLower.includes(productName)) {
            score = 500 + productName.length;
          } else if (productName.includes(productNameLower)) {
            score = 300 + productNameLower.length;
          } else {
            for (const word of searchWords) {
              if (productNameLower.includes(word)) {
                score += 50;
                if (/\d/.test(word)) score += 100;
              }
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = product;
          }
        }

        if (bestMatch && bestScore > 50) {
          // Trigger purchase flow
          const fullProduct = productsData.find(p => p.product_id === bestMatch.product_id);
          if (fullProduct) {
            handleSelectDeviceForPurchase({
              id: fullProduct.product_id,
              name: fullProduct.name,
              shortName: fullProduct.name?.split(' ').slice(0, 3).join(' ') || fullProduct.name,
              image: fullProduct.assets?.main_image?.url_medium || fullProduct.images?.[0] || '/placeholder.png',
              price: fullProduct.skus?.[0]?.price?.selling_price || 0,
              priceDisplay: fullProduct.skus?.[0]?.price
                ? `₹${fullProduct.skus[0].price.selling_price?.toLocaleString()}`
                : '',
              specs: {
                battery: { value: fullProduct.battery?.capacity_mAh ? `${fullProduct.battery.capacity_mAh} mAh` : 'N/A', score: fullProduct.battery?.capacity_mAh ? Math.min(fullProduct.battery.capacity_mAh / 60, 100) : 50 },
                display: { value: fullProduct.display?.size_inches ? `${fullProduct.display.size_inches}" ${fullProduct.display.type}` : 'N/A', score: fullProduct.display?.size_inches ? Math.min(fullProduct.display.size_inches * 12, 100) : 70 },
                camera: { value: fullProduct.camera?.rear?.[0]?.megapixels ? `${fullProduct.camera.rear[0].megapixels}MP` : 'N/A', score: fullProduct.camera?.rear?.[0]?.megapixels ? Math.min(fullProduct.camera.rear[0].megapixels / 2.5, 100) : 70 },
                ram: { value: fullProduct.memory?.ram || 'N/A', score: fullProduct.memory?.ram ? parseInt(fullProduct.memory.ram) * 5 : 60 },
                processor: { value: fullProduct.processor?.chipset || 'N/A', score: fullProduct.processor?.chipset?.includes('A17') || fullProduct.processor?.chipset?.includes('Snapdragon 8') ? 95 : 80 },
              },
            });
          } else {
            handleSelectDeviceForPurchase({
              id: bestMatch.prid,
              name: bestMatch.name,
              shortName: bestMatch.name?.split(' ').slice(0, 3).join(' ') || bestMatch.name,
              image: bestMatch.image || '/placeholder.png',
              price: bestMatch.numericPrice || 0,
              priceDisplay: bestMatch.price || '',
              specs: {
                battery: { value: 'N/A', score: 50 },
                display: { value: 'N/A', score: 70 },
                camera: { value: 'N/A', score: 70 },
                ram: { value: 'N/A', score: 60 },
                processor: { value: 'N/A', score: 80 },
              }
            });
          }
          return;
        }
      }
    }

    // Check if user wants to compare products via voice
    const compareMatch = lowerText.match(/^(?:compare|campare)\s+(.+?)\s+(?:and|vs\.?|with)\s+(.+)$/i);
    if (compareMatch && apiRecommendations.length >= 2) {
      const product1Name = compareMatch[1].trim().toLowerCase();
      const product2Name = compareMatch[2].trim().toLowerCase();

      // Find best matching products
      const findBestMatch = (searchName) => {
        let bestMatch = null;
        let bestScore = 0;

        for (const product of apiRecommendations) {
          const productName = (product.name || product.shortName || '').toLowerCase();
          const searchWords = searchName.split(/\s+/).filter(w => w.length > 1);
          const productWords = productName.split(/\s+/).filter(w => w.length > 1);

          let score = 0;
          if (productName === searchName) {
            score = 1000;
          } else if (productName.includes(searchName)) {
            score = 500 + searchName.length;
          } else if (searchName.includes(productName)) {
            score = 300 + productName.length;
          } else {
            for (const word of searchWords) {
              if (productWords.some(pw => pw.includes(word) || word.includes(pw))) {
                score += 50;
                if (/\d/.test(word)) score += 100;
              }
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = product;
          }
        }
        return bestMatch;
      };

      const match1 = findBestMatch(product1Name);
      const match2 = findBestMatch(product2Name);

      if (match1 && match2 && match1.id !== match2.id) {
        handleCompare([match1.id, match2.id]);
        return;
      }
    }

    // Check if this is the first user message (excluding welcome)
    const userMessageCount = messagesRef.current.filter(m => m.sender === 'user').length;
    const isFirstMessage = userMessageCount === 0;

    // Parse first message for smart flow
    if (isFirstMessage) {
      const parsed = parseFirstMessage(transcript);

      // If we have all the info needed, skip directly to recommendations
      if (parsed.hasDeviceType && parsed.hasPrice && parsed.hasFeatures) {
        setIsLoading(true);

        // Set the detected values
        setSelectedPrice(parsed.priceRange);
        setSelectedFeatures(parsed.features);
        setConversationStep('showing_products');

        // Build requirements and find products
        const requirements = {
          minPrice: parsed.priceRange.min,
          maxPrice: parsed.priceRange.max,
          features: parsed.features,
          keywords: parsed.features,
        };

        const result = findMatchingProducts(requirements);

        // Generate personalized message based on first feature
        const recommendations = result.matched.map(m => ({
          id: m.product.product_id,
          name: m.product.name,
          price: formatPrice(m.price, m.product.skus?.[0]?.price?.currency),
          rating: m.product.ratings?.average_rating,
          highlights: m.product.highlights,
          description: m.product.description,
          image: m.product.images?.[0],
          brand: m.product.brand,
          specMatchScore: m.specScore.percentage
        }));

        const featureId = parsed.features[0];
        const personalizedMessage = generatePersonalizedMessage(
          featureId,
          recommendations,
          parsed.priceRange,
          result.matched
        );

        // Add AI message with recommendations
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          text: personalizedMessage,
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          showProducts: true,
          recommendations
        }]);

        setFilteredRecommendations(recommendations);
        setFilterStatus(result.noResultsReason ? { noResultsReason: result.noResultsReason, nearestPrice: result.nearestPrice, message: '' } : null);

        // Set AI response for voice popup (will trigger TTS)
        setVoiceAiResponse(personalizedMessage);
        setIsLoading(false);
        return;
      }

      // We have partial info - determine what to ask for
      if (parsed.missingInfo) {
        if (parsed.missingInfo === 'device_type') {
          setConversationStep('awaiting_device_type');
          setAwaitingResponse('device_type');

          // Add acknowledgment
          setMessages((prev) => [...prev, {
            id: Date.now() + 1,
            text: "I'd be happy to help you find the perfect device!",
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          }]);

          // Set voice prompt for next question
          setVoiceAiResponse("What type of device are you looking for? You can say smartphone, feature phone, tablet, or accessories.");
          return;
        }

        if (parsed.missingInfo === 'price_range') {
          setSelectedPrice(parsed.priceRange);
          setConversationStep('awaiting_price');
          setAwaitingResponse('price_range');

          // Add acknowledgment
          const acknowledgment = `Great! I see you're looking for ${parsed.deviceType === 'smartphone' ? 'a smartphone' : parsed.deviceType === 'tablet' ? 'a tablet' : 'a device'}.`;
          setMessages((prev) => [...prev, {
            id: Date.now() + 1,
            text: acknowledgment,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          }]);

          // Set voice prompt for next question
          setVoiceAiResponse("What's your budget? You can say a price range like 10,000 to 20,000 rupees, or just tell me your maximum budget.");
          return;
        }

        if (parsed.missingInfo === 'features') {
          setSelectedPrice(parsed.priceRange);
          setConversationStep('awaiting_features');

          // Add acknowledgment
          setMessages((prev) => [...prev, {
            id: Date.now() + 1,
            text: `Perfect! I found your budget range. Now let me know what features matter most to you.`,
            sender: 'assistant',
            timestamp: new Date().toISOString(),
          }]);

          // Set voice prompt for next question
          setVoiceAiResponse("What features matter most to you? You can say camera, battery, gaming, or 5G support.");
          return;
        }
      }
    }

    // Default behavior for follow-up messages or if smart flow didn't apply
    setIsLoading(true);

    try {
      // Build message history for API - use messagesRef to avoid stale closure
      const apiMessages = messagesRef.current
        .filter(m => (m.sender === 'user' || m.sender === 'assistant') && !m.isWelcome)
        .map(m => ({
          role: m.sender,
          content: m.text
        }));

      // Add the new user message
      apiMessages.push({
        role: 'user',
        content: transcript
      });

      // Add system instruction with conversation flow context
      const availableStepsStr = CONVERSATION_STEPS.join(', ');
      apiMessages.unshift({
        role: 'system',
        content: `You are an AI shopping assistant. Follow this conversation flow: ${availableStepsStr}. Current step: ${conversationStep}. Respond with JSON format: {"message": "your response text", "nextStep": "one of the available steps"}. Keep responses brief (1-2 sentences). Be concise and to the point. Only ask clarifying questions when truly needed.`
      });

      // Create a placeholder for the streaming response
      const aiMessageId = generateId();
      setMessages((prev) => [...prev, {
        id: aiMessageId,
        text: '',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);

      // Stream the response - pass current conversation step to API
      let fullResponse = '';
      let recommendations = null;
      let nextStep = null;

      for await (const chunk of chatApi.streamMessage(apiMessages, conversationStep)) {
        if (chunk.done) {
          // Final chunk - only capture recommendations, content already streamed
          recommendations = chunk.recommendations;
        } else if (chunk.content) {
          // Streaming chunk - accumulate content
          fullResponse += chunk.content;
        }
        if (chunk.nextStep) {
          nextStep = chunk.nextStep;
        }

        // Parse and display immediately for streaming effect
        let displayText = fullResponse;
        try {
          // Clean up markdown code blocks (handle multiline) and parse JSON
          const cleaned = fullResponse
            .replace(/^```json\s*/m, '')
            .replace(/\s*```$/m, '')
            .trim();
          const parsed = JSON.parse(cleaned);
          displayText = parsed.message || fullResponse;
          if (parsed.nextStep) {
            nextStep = parsed.nextStep;
          }
        } catch {
          // Not valid JSON yet, show as-is
        }

        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: displayText }
              : m
          )
        );
      }

      // Final parse to get clean message
      let finalMessageText = fullResponse;
      try {
        const cleaned = fullResponse
          .replace(/^```json\s*/m, '')
          .replace(/\s*```$/m, '')
          .trim();
        const parsed = JSON.parse(cleaned);
        finalMessageText = parsed.message || fullResponse;
        if (parsed.nextStep && !nextStep) {
          nextStep = parsed.nextStep;
        }
      } catch {
        // If not valid JSON, use as-is
      }

      // Update final message with recommendations if any
      if (recommendations && recommendations.length > 0) {
        setApiRecommendations(recommendations);
        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: finalMessageText, showProducts: true, recommendations }
              : m
          )
        );
      }

      // Update conversation step based on AI response
      // Only update if different and valid, and advance to recommendations if products shown
      if (recommendations && recommendations.length > 0) {
        setConversationStep('recommendations');
      } else if (nextStep && nextStep !== conversationStep && CONVERSATION_STEPS.includes(nextStep)) {
        setConversationStep(nextStep);
      }

      // Auto-read the AI response (use clean message text)
      speakAiResponse(finalMessageText);
    } catch (error) {
      console.error('Voice chat error:', error);
      const errorMessage = 'Sorry, I had trouble connecting. Please try again.';
      setMessages((prev) => [...prev, {
        id: generateId(),
        text: errorMessage,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);
      speakAiResponse(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Summarize text for voice
  const summarizeForVoice = async (text) => {
    try {
      const response = await fetch(`${API_URL}/api/summarize-for-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.warn('Summarization failed, using original text');
        return text;
      }

      const data = await response.json();
      return data.summary;
    } catch (error) {
      console.error('Summarize error:', error);
      return text;
    }
  };

  // Speak AI response using Polly
  const speakAiResponse = useCallback(async (text) => {
    if (!text || text.trim() === '') return;

    // Avoid re-speaking the same response
    if (text === lastSpokenResponseRef.current) return;
    lastSpokenResponseRef.current = text;

    setIsVoiceSpeaking(true);

    try {
      // Stop any current audio
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current = null;
      }

      // Summarize the text first for voice
      const summarizedText = await summarizeForVoice(text);

      const response = await fetch(`${API_URL}/api/polly/speak-chat-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: summarizedText, isAssistant: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to synthesize speech');
      }

      const data = await response.json();

      const audio = new Audio(data.audio);
      voiceAudioRef.current = audio;

      audio.onended = () => {
        setIsVoiceSpeaking(false);
        voiceAudioRef.current = null;
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        setIsVoiceSpeaking(false);
        voiceAudioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error('Error speaking AI response:', error);
      setIsVoiceSpeaking(false);
    }
  }, []);

  // Stop voice audio
  const stopVoiceAudio = useCallback(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current = null;
    }
    setIsVoiceSpeaking(false);
  }, []);

  // Stop voice listening
  const stopVoiceListening = useCallback(() => {
    if (voiceRecognitionRef.current) {
      try {
        voiceRecognitionRef.current.stop();
        voiceRecognitionRef.current.abort();
      } catch {}
      voiceRecognitionRef.current = null;
    }
    setIsVoiceListening(false);

    // Stop audio visualization
    if (voiceAnimationFrameRef.current) {
      cancelAnimationFrame(voiceAnimationFrameRef.current);
      voiceAnimationFrameRef.current = null;
    }
    if (voiceAudioContextRef.current) {
      voiceAudioContextRef.current.close();
      voiceAudioContextRef.current = null;
    }
  }, []);

  // Start voice listening
  const startVoiceListening = useCallback(() => {
    stopVoiceAudio();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';
    let silenceTimer = null;
    let hasSpoken = false;
    let hasTriggered = false;

    recognition.onstart = () => {
      setIsVoiceListening(true);
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          hasSpoken = true;
        }
      }

      // Reset silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      silenceTimer = setTimeout(() => {
        if (!hasTriggered && finalTranscript.trim()) {
          hasTriggered = true;
          handleVoiceMode(finalTranscript.trim());
          recognition.stop();
        }
      }, 1500);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsVoiceListening(false);

      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
    };

    recognition.onend = () => {
      setIsVoiceListening(false);

      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }

      // Safe fallback (only if not already triggered)
      if (!hasTriggered && hasSpoken && finalTranscript.trim()) {
        hasTriggered = true;
        handleVoiceMode(finalTranscript.trim());
      }
    };

    voiceRecognitionRef.current = recognition;
    recognition.start();

    // Start audio visualization
    const initAudioVisualization = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.8;
        microphone.connect(analyser);

        voiceAudioContextRef.current = audioContext;
        voiceAnalyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animate = () => {
          if (!voiceAnalyserRef.current) return;

          voiceAnalyserRef.current.getByteFrequencyData(dataArray);

          // Get 5 frequency bands for the waveform bars
          const levels = [];
          const step = Math.floor(dataArray.length / 5);

          for (let i = 0; i < 5; i++) {
            const value = dataArray[i * step];
            const normalized = Math.min(1, (value / 255) * 1.5);
            levels.push(normalized);
          }

          setVoiceAudioLevels(levels);
          voiceAnimationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();
      } catch (err) {
        console.error('Audio visualization error:', err);
      }
    };

    initAudioVisualization();
  }, [handleVoiceMode, stopVoiceAudio]);

  // Toggle voice listening
  const toggleVoiceListening = () => {
    if (isVoiceListening) {
      stopVoiceListening();
    } else {
      startVoiceListening();
    }
  };

  // Cleanup voice on unmount
  useEffect(() => {
    return () => {
      stopVoiceListening();
      stopVoiceAudio();
    };
  }, [stopVoiceListening, stopVoiceAudio]);

  // Build product data for comparison
  const buildProductData = () => {
    const data = {};
    productsData
      .filter(product => product.category === 'Smartphones')
      .forEach(product => {
        data[product.product_id] = {
          id: product.product_id,
          name: product.name,
          shortName: product.name.split(' ').slice(0, 3).join(' '),
          // image: product.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=200&h=200&fit=crop',
          image: product.images?.[0] || '/placeholder.png',
          price: product.skus?.[0]?.price?.selling_price || 0,
          priceDisplay: product.skus?.[0]?.price
            ? `${product.skus[0].price.currency === 'INR' ? '₹' : '$'}${product.skus[0].price.selling_price?.toLocaleString()}`
            : '',
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

  const productDataMap = buildProductData();

  const specLabels = {
    battery: { icon: Battery, label: 'Battery' },
    display: { icon: Signal, label: 'Display' },
    camera: { icon: Camera, label: 'Camera' },
    ram: { icon: Battery, label: 'RAM' },
    processor: { icon: Bot, label: 'Processor' },
  };

  // Inline Comparison Component
  const InlineComparison = ({ selectedIds, onRemove, onSelect, onClose }) => {
    const products = useMemo(() => {
      return selectedIds.map(id => {
        // First check if we have full data in productDataMap
        if (productDataMap[id]) {
          return productDataMap[id];
        }

        // Find in apiRecommendations and look up full product data
        const fromApi = apiRecommendations.find(p => p.id === id);
        if (fromApi) {
          // Look up full product details from productsData
          const fullProduct = productsData.find(p => p.product_id === id);
          if (fullProduct) {
            return {
              id: fullProduct.product_id,
              name: fullProduct.name,
              shortName: fullProduct.name?.split(' ').slice(0, 3).join(' ') || fullProduct.name,
              image: fullProduct.assets?.main_image?.url_medium || fullProduct.images?.[0] || '/placeholder.png',
              price: fullProduct.skus?.[0]?.price?.selling_price || 0,
              priceDisplay: fullProduct.skus?.[0]?.price
                ? `₹${fullProduct.skus[0].price.selling_price?.toLocaleString()}`
                : '',
              specs: {
                battery: { value: fullProduct.battery?.capacity_mAh ? `${fullProduct.battery.capacity_mAh} mAh` : 'N/A', score: fullProduct.battery?.capacity_mAh ? Math.min(fullProduct.battery.capacity_mAh / 60, 100) : 50 },
                display: { value: fullProduct.display?.size_inches ? `${fullProduct.display.size_inches}" ${fullProduct.display.type}` : 'N/A', score: fullProduct.display?.size_inches ? Math.min(fullProduct.display.size_inches * 12, 100) : 70 },
                camera: { value: fullProduct.camera?.rear?.[0]?.megapixels ? `${fullProduct.camera.rear[0].megapixels}MP` : 'N/A', score: fullProduct.camera?.rear?.[0]?.megapixels ? Math.min(fullProduct.camera.rear[0].megapixels / 2.5, 100) : 70 },
                ram: { value: fullProduct.memory?.ram || 'N/A', score: fullProduct.memory?.ram ? parseInt(fullProduct.memory.ram) * 5 : 60 },
                processor: { value: fullProduct.processor?.chipset || 'N/A', score: fullProduct.processor?.chipset?.includes('A17') || fullProduct.processor?.chipset?.includes('Snapdragon 8') ? 95 : 80 },
              },
            };
          }

          // Fallback to api data with N/A specs
          return {
            id: fromApi.id,
            name: fromApi.name,
            shortName: fromApi.name?.split(' ').slice(0, 3).join(' ') || fromApi.name,
            image: fromApi.image || '/placeholder.png',
            price: fromApi.numericPrice || 0,
            priceDisplay: fromApi.price || '',
            specs: {
              battery: { value: 'N/A', score: 50 },
              display: { value: 'N/A', score: 70 },
              camera: { value: 'N/A', score: 70 },
              ram: { value: 'N/A', score: 60 },
              processor: { value: 'N/A', score: 80 },
            }
          };
        }
        return null;
      }).filter(Boolean);
    }, [selectedIds, apiRecommendations]);

    const bestDevice = useMemo(() => {
      if (products.length === 0) return null;
      return products.reduce((best, current) => {
        const bestScore = Object.values(best.specs).reduce((sum, s) => sum + s.score, 0);
        const currentScore = Object.values(current.specs).reduce((sum, s) => sum + s.score, 0);
        return currentScore > bestScore ? current : best;
      });
    }, [products]);

    const getInsight = (specKey) => {
      const values = products.map(p => ({ id: p.id, value: p.specs[specKey].value, score: p.specs[specKey].score }));
      const best = values.reduce((max, curr) => curr.score > max.score ? curr : max);
      return { bestId: best.id, text: best.value };
    };

    // Generate verdict message
    const verdict = useMemo(() => {
      if (!bestDevice || products.length < 2) return null;
      
      const winningSpecs = [];
      Object.entries(bestDevice.specs).forEach(([key, spec]) => {
        const isBest = products.every(p => p.id === bestDevice.id || spec.score >= p.specs[key].score);
        if (isBest) {
          const label = specLabels[key]?.label || key;
          winningSpecs.push(label.toLowerCase());
        }
      });
      
      const specText = winningSpecs.slice(0, 2).join(' and ');
      return {
        winner: bestDevice.name,
        reason: `Based on the comparison, the ${bestDevice.name} is the better choice with superior ${specText}. It offers the best overall value for your needs.`
      };
    }, [bestDevice, products]);

    return (
      <div className="inline-comparison">
        <div className="inline-comparison-header">
          <span className="comparison-title-chat">Compare {products.length} Phones</span>
          <button className="close-comparison-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        
        <div className="inline-comparison-grid">
          {products.map(product => (
            <div 
              key={product.id} 
              className="inline-comparison-device"
              onClick={() => onSelect(product)}
            >
              <button 
                className="remove-device-chat"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(product.id);
                }}
              >
                <X size={12} />
              </button>
              <img src={product.image} alt={product.name} className="device-img-chat" />
              <span className="device-name-chat">{product.shortName}</span>
              <span className="device-price-chat">{product.priceDisplay}</span>
              {bestDevice?.id === product.id && <span className="best-badge">🏆 Best</span>}
            </div>
          ))}
        </div>

        <div className="inline-specs">
          {Object.entries(specLabels).map(([key, { icon: Icon, label }]) => {
            const insight = getInsight(key);
            return (
              <div key={key} className="inline-spec-row">
                <div className="spec-header-chat">
                  <Icon size={14} />
                  <span>{label}</span>
                </div>
                <div className="spec-values-chat">
                  {products.map(product => (
                    <div 
                      key={product.id} 
                      className={`spec-value-chat ${product.id === insight.bestId ? 'best' : ''}`}
                    >
                      {product.specs[key].value}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verdict Section */}
        {verdict && (
          <div className="comparison-verdict">
            <div className="verdict-header">
              <span className="verdict-icon">🏆</span>
              <span className="verdict-title">Verdict</span>
            </div>
            <p className="verdict-text">{verdict.reason}</p>
          </div>
        )}

        <div className="comparison-footer-chat">
          <p className="select-hint">Tap a device above to select for purchase</p>
        </div>
      </div>
    );
  };

  // Find Pro/upgrade variant of a product using smart matching
  const findProVariant = (currentProduct) => {
    // First try to find a smart upgrade (within 15-35% price range)
    const smartUpgrade = findSmartProVariant(currentProduct, productsData);
    if (smartUpgrade) return smartUpgrade;

    // Fallback: Look for products with similar names but "Pro" or higher tier
    const baseName = currentProduct.name.split(' ').slice(0, 2).join(' ');
    const currentPrice = currentProduct.price || getProductPrice(currentProduct);

    const variants = productsData.filter(p => {
      const variantPrice = getProductPrice(p);
      return p.category === 'Smartphones' &&
             p.name.includes(baseName) &&
             p.product_id !== currentProduct.id &&
             p.product_id !== currentProduct.product_id &&
             variantPrice > currentPrice;
    });

    // Return the cheapest upgrade option or null
    return variants.length > 0
      ? variants.sort((a, b) => getProductPrice(a) - getProductPrice(b))[0]
      : null;
  };

  // Inline Payment Component
  const InlinePaymentOptions = ({ product, onBack, onProceed }) => {
    const [expandedOffer, setExpandedOffer] = useState('hdfc');
    const [selectedTenure, setSelectedTenure] = useState(6);
    const [explainedOffer, setExplainedOffer] = useState(null);

    const emiOffers = [
      {
        id: 'hdfc',
        bank: 'HDFC',
        type: '0% EMI',
        tenureMonths: 6,
        monthlyEMI: Math.round((product.price * 1.1) / 6),
        mrpValue: product.price * 1.1,
        instantDiscount: product.price * 0.07,
        processingFee: 199,
        interest: 0,
        totalPayable: product.price * 1.03,
        isBestOffer: true,
      },
      {
        id: 'icici',
        bank: 'ICICI',
        type: 'Low Interest EMI',
        tenureMonths: 12,
        monthlyEMI: Math.round((product.price * 1.15) / 12),
        mrpValue: product.price * 1.1,
        instantDiscount: 0,
        processingFee: 0,
        interest: product.price * 0.05,
        totalPayable: product.price * 1.15,
        isBestOffer: false,
      },
    ];

    const formatCurrency = (amount) => {
      return '₹' + Math.round(amount).toLocaleString('en-IN');
    };

    const handleExplainOffer = (offer) => {
      setExplainedOffer(offer.id);
      // In a real implementation, this would call an AI service
      // For now, we'll just show a simple explanation
    };

    return (
      <div className="inline-payment-options">
        <div className="payment-header-inline">
          <h3>Pay in easy instalments</h3>
          <p>Select an offer that fits your budget</p>
        </div>

        <div className="emi-options-list">
          {emiOffers.sort((a, b) => (b.isBestOffer ? 1 : 0) - (a.isBestOffer ? 1 : 0)).map((offer) => {
            const isExpanded = expandedOffer === offer.id;
            const isExplained = explainedOffer === offer.id;
            return (
              <div key={offer.id} className={`emi-option-card ${offer.isBestOffer ? 'best' : ''}`}>
                <div className="emi-option-header" onClick={() => setExpandedOffer(isExpanded ? null : offer.id)}>
                  <div className="emi-bank-info">
                    <span className="emi-bank-name">{offer.bank}</span>
                    <span className="emi-type">{offer.type} · {offer.tenureMonths} months</span>
                  </div>
                  <div className="emi-monthly">
                    <span className="emi-amount">{formatCurrency(offer.monthlyEMI)}/mo</span>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="emi-details-inline">
                    <div className="tenure-selector-inline">
                      {[3, 6, 9, 12].map((months) => (
                        <button
                          key={months}
                          className={`tenure-pill ${selectedTenure === months ? 'active' : ''}`}
                          onClick={() => setSelectedTenure(months)}
                        >
                          {months}M
                        </button>
                      ))}
                    </div>
                    <div className="emi-breakdown-inline">
                      <div><span>MRP Value</span><span>{formatCurrency(offer.mrpValue)}</span></div>
                      <div><span>Instant Discount</span><span className="discount">-{formatCurrency(offer.instantDiscount)}</span></div>
                      <div><span>Processing Fee</span><span>{formatCurrency(offer.processingFee)}</span></div>
                      <div className="total-row"><span>Total Payable</span><span>{formatCurrency(offer.totalPayable)}</span></div>
                    </div>
                    
                    {/* Explain Offer Section */}
                    {isExplained && (
                      <div className="offer-explanation-inline">
                        <p>This {offer.type} from {offer.bank} allows you to pay {formatCurrency(offer.monthlyEMI)} per month for {offer.tenureMonths} months. 
                        {offer.instantDiscount > 0 ? ` You save ${formatCurrency(offer.instantDiscount)} with instant discount.` : ''} 
                        Total interest charged: {formatCurrency(offer.interest)}.</p>
                      </div>
                    )}
                    
                    <button className="proceed-btn-inline" onClick={() => onProceed(offer)}>
                      Proceed with {offer.bank}
                    </button>
                    
                    {/* AI Powered - Explain Offer */}
                    <div className="ai-powered-inline">
                      <button className="explain-offer-link" onClick={() => handleExplainOffer(offer)}>
                        {isExplained ? 'Hide explanation' : 'Explain this offer'}
                      </button>
                      <span className="ai-badge-inline">
                        ✨ POWERED BY AI
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="back-to-product-btn" onClick={onBack}>
          ← Back to product
        </button>
      </div>
    );
  };

  // Inline Purchase Component
  const InlinePurchase = ({ product, onBack, onBuy, onUpgrade }) => {
    const [showPayment, setShowPayment] = useState(false);

    // Find Pro variant using smart matching
    const proVariant = useMemo(() => findProVariant(product), [product]);

    // Calculate upgrade price difference
    const upgradePrice = proVariant
      ? getProductPrice(proVariant) - (product.price || getProductPrice(product))
      : 0;

    // Determine if upgrade is a "smart" upgrade (within reasonable range)
    const isSmartUpgrade = proVariant && upgradePrice > 0 && upgradePrice <= (product.price || getProductPrice(product)) * 0.35;

    if (showPayment) {
      return (
        <div className="inline-purchase">
          <InlinePaymentOptions 
            product={product}
            onBack={() => setShowPayment(false)}
            onProceed={(offer) => onBuy(product, offer)}
          />
        </div>
      );
    }

    return (
      <div className="inline-purchase">
        <div className="purchase-product-card">
          <div className="purchase-product-img">
            <img src={product.image} alt={product.name} />
          </div>
          <h3 className="purchase-product-name">{product.name}</h3>
          <p className="purchase-product-price">{product.priceDisplay}</p>
          
          <div className="ai-reasoning">
            <span>✨ AI Recommendation</span>
            <p>Based on your preferences, this phone offers the best value with excellent camera and battery life.</p>
          </div>

          {proVariant && isSmartUpgrade && (
            <div className="swap-suggestion">
              <span>💡 Upgrade Available</span>
              <p>For just {formatPrice(upgradePrice)} more ({Math.round((upgradePrice / (product.price || getProductPrice(product))) * 100)}% more), upgrade to the <strong>{proVariant.name}</strong> with enhanced features:</p>
              <ul className="upgrade-features">
                {proVariant.highlights?.slice(0, 2).map((highlight, idx) => (
                  <li key={idx}>✓ {highlight}</li>
                ))}
              </ul>
              <div className="swap-actions">
                <button className="swap-btn" onClick={() => onUpgrade(proVariant)}>
                  Upgrade to {proVariant.name.split(' ').slice(-2).join(' ')}
                </button>
                <button className="keep-btn" onClick={() => setShowPayment(true)}>
                  Continue with this
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="purchase-actions">
          <button className="buy-now-btn" onClick={() => setShowPayment(true)}>
            Buy Now - {product.priceDisplay}
          </button>
          <button className="back-link" onClick={onBack}>
            Compare again
          </button>
        </div>
      </div>
    );
  };

  // Click handler to initialize earphone controls on first interaction
  const handleFirstInteraction = async () => {
    setIsEarphoneEnabled(true);
    if (!isEarphoneEnabled && !audioRef.current) {
      try {
        await enableEarphoneControls();
      } catch (err) {
        console.log('Audio init failed:', err.message);
      }
    }
  };

  return (
    <div className="ai-shopper-container" onClick={handleFirstInteraction}>
      <div className="top-toolbar">
        <div className="toolbar-logo">
          <div className="logo-icon">
            <Bot size={24} />
          </div>
          <span className="logo-text">ShopAI</span>
        </div>
      </div>

      <div className="messages-container">
        {/* Header - hidden when voice popup is open */}
        {!isVoicePopupOpen && (
          <div className="header-section">
            <div className="avatar-container">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
                alt="AI Shopper Avatar"
                className="avatar-image"
              />
            </div>
            <h1 className="welcome-title">Hello there!</h1>
            <p className="welcome-subtitle">
              I&apos;m your personal AI shopper. Tell me what&apos;s on your mind today.
            </p>
          </div>
        )}

        {/* <div className="category-section">
          <div className="category-buttons">
            {categories.map((category) => (
              <button
                key={category.id}
                className="category-button"
                onClick={() => handleCategoryClick(category.name)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div> */}

        {/* Messages - hidden when voice popup is open, skip empty messages */}
        {!isVoicePopupOpen && messages.map((message) => (
          // Skip rendering empty assistant messages (placeholders during streaming)
          (message.sender !== 'assistant' || message.text || message.showProducts) && (
            <div key={message.id} className={`message-wrapper ${message.sender}`}>
              {message.sender === 'assistant' && (
                <div className="message-avatar assistant-avatar">
                  <Bot size={20} />
                </div>
              )}
              <div className="message-content">
                <div className={`message-bubble ${message.sender}`}>
                  <p>{message.text}</p>
                </div>
                {/* Show ProductRecommendations inline after AI message when showProducts is true */}
                {message.sender === 'assistant' && message.showProducts && (
                  <div className="message-bubble assistant products" style={{ marginTop: '8px' }}>
                    <ProductRecommendations
                      recommendations={message.recommendations || apiRecommendations}
                      onCompare={handleCompare}
                      onProductSelect={onProductSelect}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        ))}

        {/* Show loading indicator only when no streaming message exists */}
        {!isVoicePopupOpen && isLoading && (
        // {isLoading && !messages.some(m => m.sender === 'assistant' && m.text === '') && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-bubble assistant loading">
                <div className="loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Device Type Selection Tiles - shown when AI indicates need for category selection */}
        {/* {!isVoicePopupOpen && !isLoading && !isVoiceMode && awaitingResponse === 'device_type' && ( */}
        {!isLoading && conversationStep === 'category' && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar" style={{ visibility: 'hidden' }}>
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-label" style={{ visibility: 'hidden' }}>ASSISTANT</div>
              <div className="message-bubble assistant device-type-selection">
                <p className="selection-prompt">What type of device are you looking for?</p>
                <div className="device-type-grid">
                  {deviceTypes.map((device) => (
                    <button
                      key={device.id}
                      className="device-type-btn"
                      onClick={() => handleDeviceTypeSelect(device)}
                    >
                      <span className="device-icon">{device.icon}</span>
                      <span className="device-label">{device.label}</span>
                      <span className="device-desc">{device.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Price Selection Tiles - shown when AI indicates need for budget selection */}
        {/* {!isVoicePopupOpen && !isLoading && !isVoiceMode && awaitingResponse === 'price_range' && ( */}
        {!isLoading && conversationStep === 'budget_range' && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar" style={{ visibility: 'hidden' }}>
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-label" style={{ visibility: 'hidden' }}>ASSISTANT</div>
              <div className="message-bubble assistant price-selection">
                <p className="selection-prompt">To help me find the best options for you, please select your budget range:</p>
                <div className="chat-price-buttons">
                  {priceRanges.map((range) => (
                    <button
                      key={range.id}
                      className="chat-price-btn"
                      onClick={() => handlePriceSelect(range)}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Selection Tiles - shown when AI indicates need for feature selection */}
        {/* {!isVoicePopupOpen && !isLoading && !isVoiceMode && conversationStep === 'awaiting_features' && ( */}
        {!isLoading && conversationStep === 'features' && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar" style={{ visibility: 'hidden' }}>
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-label" style={{ visibility: 'hidden' }}>ASSISTANT</div>
              <div className="message-bubble assistant feature-selection">
                <p className="selection-prompt">Great! Now select the features that matter most to you:</p>
                <div className="chat-feature-grid">
                  {priorityFeatures.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <button
                        key={feature.id}
                        className="chat-feature-btn"
                        onClick={() => handleFeatureSelect(feature)}
                      >
                        <Icon size={24} />
                        <span>{feature.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline Comparison - full width, outside message bubble (hidden when voice popup open) */}
        {!isVoicePopupOpen && conversationStep === 'comparing' && selectedProducts.length >= 2 && !isLoading && (
          <div className="full-width-section comparison-section">
            <InlineComparison
              selectedIds={selectedProducts}
              onRemove={handleRemoveFromComparison}
              onSelect={handleSelectDeviceForPurchase}
              onClose={handleCloseComparison}
            />
          </div>
        )}

        {/* Inline Purchase - full width, outside message bubble (hidden when voice popup open) */}
        {!isVoicePopupOpen && conversationStep === 'purchasing' && purchaseProduct && !isLoading && (
          <div className="full-width-section purchase-section">
            <InlinePurchase
              product={purchaseProduct}
              onBack={handleClosePurchase}
              onBuy={handleFinalBuy}
              onUpgrade={handleUpgrade}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-section">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <button type="button" className="icon-button qr-button" onClick={handleOpenScanner}>
              <QrCode size={20} />
            </button>
            <input
              type="text"
              placeholder="Type your request..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
              className="chat-input"
            />
            {inputValue.trim() ? (
              <button type="submit" className="icon-button send-button">
                <Send size={20} />
              </button>
            ) : (
              <button
                type="button"
                className={`icon-button mic-button ${isVoiceListening ? 'listening' : ''} ${isVoiceSpeaking ? 'speaking' : ''}`}
                onClick={toggleVoiceListening}
                title={isVoiceListening ? 'Tap to stop listening' : isVoiceSpeaking ? 'Tap to stop speaking' : 'Tap to speak'}
              >
                {isVoiceListening ? (
                  <div className="voice-waveform">
                    {/* <button type="button" className="icon-button mic-button" onClick={handleOpenVoicePopup}>
                      <Mic size={20} /> */}
                    {voiceAudioLevels.map((level, index) => (
                      <div
                        key={index}
                        className="voice-waveform-bar"
                        style={{
                          height: `${8 + level * 16}px`,
                          opacity: 0.4 + level * 0.6,
                        }}
                      />
                    ))}
                  </div>
                ) : isVoiceSpeaking ? (
                  <Volume2 size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScanSuccess={handleScanSuccess}
      />

    </div>
  );
}

export default AIShopper;

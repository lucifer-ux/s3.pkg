import { useState, useRef, useEffect, useMemo } from 'react';
import { QrCode, Mic, Send, Camera, Battery, Gamepad2, Signal, Bot, X, ChevronLeft, Check } from 'lucide-react';
import QRScannerModal from './QRScannerModal';
import VoiceInputModal from './VoiceInputModal';
import VoicePopup from './VoicePopup';
import ProductRecommendations from './ProductRecommendations';
import PaymentOptions from './PaymentOptions';
import './AIShopper.css';
import productsData from '../products.json';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// API client for chat
const chatApi = {
  async sendMessage(messages) {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    if (!response.ok) throw new Error('Failed to get response');
    return response.json();
  },

  async *streamMessage(messages) {
    const response = await fetch(`${API_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
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
            // Yield final result with recommendations
            yield { done: true, content: fullContent, recommendations };
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
              fullContent = parsed.fullContent || fullContent;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
  }
};

function AIShopper() {
  const [inputValue, setInputValue] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [isVoiceInputOpen, setIsVoiceInputOpen] = useState(false);
  const [isVoicePopupOpen, setIsVoicePopupOpen] = useState(false);
  const [voiceUserMessage, setVoiceUserMessage] = useState('');
  const [voiceAiResponse, setVoiceAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStep, setConversationStep] = useState('initial'); // 'initial' -> 'awaiting_device_type' -> 'awaiting_price' -> 'awaiting_features' -> 'showing_products' -> 'comparing' -> 'purchasing'
  const [awaitingResponse, setAwaitingResponse] = useState(null); // 'device_type', 'price_range', etc.
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [cartCount] = useState(2);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [purchaseProduct, setPurchaseProduct] = useState(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

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

    const userMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
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

      // Add instruction to ask one question at a time if this is the first message
      if (apiMessages.length <= 1) {
        apiMessages.unshift({
          role: 'system',
          content: 'This is the start of the conversation. Ask only ONE question: What category are you looking for (phones, laptops, etc.)? Do NOT ask multiple questions.'
        });
      }

      // Create a placeholder for the streaming response
      const aiMessageId = Date.now() + 1;
      setMessages((prev) => [...prev, {
        id: aiMessageId,
        text: '',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);

      // Stream the response
      let fullText = '';
      let recommendations = null;
      for await (const chunk of chatApi.streamMessage(apiMessages)) {
        if (chunk.content) {
          fullText += chunk.content;
          setMessages((prev) =>
            prev.map(m =>
              m.id === aiMessageId
                ? { ...m, text: fullText }
                : m
            )
          );
        }
        if (chunk.done) {
          recommendations = chunk.recommendations;
          fullText = chunk.content || fullText;
        }
      }

      // Update final message with recommendations if any
      if (recommendations && recommendations.length > 0) {
        setApiRecommendations(recommendations);
        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: fullText, showProducts: true, recommendations }
              : m
          )
        );
      }

      // After first AI response about phones, show device type tiles
      const lowerText = messageText.toLowerCase();
      if ((lowerText.includes('phone') || lowerText.includes('mobile')) && conversationStep === 'initial') {
        setAwaitingResponse('device_type');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
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
      id: Date.now(),
      text: selectionText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setAwaitingResponse(null);
    setConversationStep('awaiting_price');

    // Send to AI
    sendToAI(selectionText);
  };

  const handlePriceSelect = (priceRange) => {
    // Add user selection message
    const selectionText = `My budget is ${priceRange.label}`;
    const selectionMessage = {
      id: Date.now(),
      text: selectionText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setSelectedPrice(priceRange);
    setConversationStep('awaiting_features');
    setAwaitingResponse(null);

    // Send to AI
    sendToAI(selectionText);
  };

  const handleFeatureSelect = (feature) => {
    // Add user selection message
    const selectionText = `I prioritize ${feature.label}`;
    const selectionMessage = {
      id: Date.now(),
      text: selectionText,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setConversationStep('showing_products');

    // Send to AI
    sendToAI(selectionText);
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
      const aiMessageId = Date.now() + 1;
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
      id: Date.now(),
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
      id: Date.now(),
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
      id: Date.now(),
      text: `Congratulations! Your order for ${product.name}${offerText} has been placed successfully. Is there anything else I can help you with?`,
      sender: 'assistant',
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleUpgrade = (proVariant) => {
    // Convert the proVariant to the same format as purchaseProduct
    const upgradedProduct = {
      id: proVariant.product_id,
      name: proVariant.name,
      shortName: proVariant.name.split(' ').slice(0, 3).join(' '),
      image: proVariant.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=200&h=200&fit=crop',
      price: proVariant.skus?.[0]?.price?.selling_price || 0,
      priceDisplay: proVariant.skus?.[0]?.price
        ? `${proVariant.skus[0].price.currency === 'INR' ? '₹' : '$'}${proVariant.skus[0].price.selling_price?.toLocaleString()}`
        : '',
    };
    
    setPurchaseProduct(upgradedProduct);
    // Add upgrade message to chat
    setMessages((prev) => [...prev, {
      id: Date.now(),
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

  const handleOpenVoiceInput = () => {
    setIsVoiceInputOpen(true);
  };

  const handleCloseVoiceInput = () => {
    setIsVoiceInputOpen(false);
  };

  const handleVoiceTranscriptComplete = (transcript) => {
    handleSendMessage(transcript);
  };

  // Handle voice mode - show popup and send message
  const handleVoiceMode = async (transcript) => {
    if (!transcript.trim()) return;

    // Set user message for popup
    setVoiceUserMessage(transcript);

    // Send message in background (same as regular chat)
    const userMessage = {
      id: Date.now(),
      text: transcript,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build message history for API
      const apiMessages = messages
        .filter(m => m.sender === 'user' || m.sender === 'assistant')
        .map(m => ({
          role: m.sender,
          content: m.text
        }));

      apiMessages.push({
        role: 'user',
        content: transcript
      });

      // Create a placeholder for the streaming response
      const aiMessageId = Date.now() + 1;
      setMessages((prev) => [...prev, {
        id: aiMessageId,
        text: '',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);

      // Stream the response
      let fullText = '';
      let recommendations = null;
      for await (const chunk of chatApi.streamMessage(apiMessages)) {
        if (chunk.content) {
          fullText += chunk.content;
          setMessages((prev) =>
            prev.map(m =>
              m.id === aiMessageId
                ? { ...m, text: fullText }
                : m
            )
          );
        }
        if (chunk.done) {
          fullText = chunk.content || fullText;
          recommendations = chunk.recommendations;
        }
      }

      // Update final message with recommendations if any
      if (recommendations && recommendations.length > 0) {
        setApiRecommendations(recommendations);
        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: fullText, showProducts: true, recommendations }
              : m
          )
        );
      }

      // Set AI response for voice popup (will trigger TTS)
      setVoiceAiResponse(fullText);
    } catch (error) {
      console.error('Voice chat error:', error);
      const errorMessage = 'Sorry, I had trouble connecting. Please try again.';
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        text: errorMessage,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
      }]);
      setVoiceAiResponse(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiFinishedSpeaking = () => {
    // AI finished speaking - user can now tap to speak again
  };

  const handleTapToSpeak = (transcript) => {
    // User tapped mic and spoke - send to AI
    handleVoiceMode(transcript);
  };

  const handleCloseVoicePopup = () => {
    setIsVoicePopupOpen(false);
    setVoiceUserMessage('');
    setVoiceAiResponse('');
  };

  const getLastAiMessage = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'assistant') {
        return messages[i];
      }
    }
    return null;
  };

  const lastAiMessage = getLastAiMessage();

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
          image: product.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff23?w=200&h=200&fit=crop',
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
      return selectedIds.map(id => productDataMap[id]).filter(Boolean);
    }, [selectedIds]);

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

  // Find Pro/upgrade variant of a product
  const findProVariant = (currentProduct) => {
    // Look for products with similar names but "Pro" or higher tier
    const baseName = currentProduct.name.split(' ').slice(0, 2).join(' ');
    const variants = productsData.filter(p => 
      p.category === 'Smartphones' && 
      p.name.includes(baseName) &&
      p.product_id !== currentProduct.id &&
      (p.skus?.[0]?.price?.selling_price || 0) > currentProduct.price
    );
    
    // Return the cheapest upgrade option or null
    return variants.length > 0 
      ? variants.sort((a, b) => (a.skus?.[0]?.price?.selling_price || 0) - (b.skus?.[0]?.price?.selling_price || 0))[0]
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
    
    // Find Pro variant
    const proVariant = useMemo(() => findProVariant(product), [product]);
    
    // Calculate upgrade price difference
    const upgradePrice = proVariant 
      ? (proVariant.skus?.[0]?.price?.selling_price || 0) - product.price 
      : 0;

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

          {proVariant && (
            <div className="swap-suggestion">
              <span>💡 Upgrade Available</span>
              <p>For ₹{upgradePrice.toLocaleString()} more, you could get the {proVariant.name.split(' ').slice(-2).join(' ')} with better features.</p>
              <div className="swap-actions">
                <button className="swap-btn" onClick={() => onUpgrade(proVariant)}>
                  Upgrade to Pro
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

  return (
    <div className="ai-shopper-container">
      <div className="top-toolbar">
        <div className="toolbar-logo">
          <div className="logo-icon">
            <Bot size={24} />
          </div>
          <span className="logo-text">ShopAI</span>
        </div>
      </div>

      <div className="messages-container">
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

        {messages.map((message) => (
          <div key={message.id} className={`message-wrapper ${message.sender}`}>
            {message.sender === 'assistant' && (
              <div className="message-avatar assistant-avatar">
                <Bot size={20} />
              </div>
            )}
            <div className="message-content">
              <div className="message-label">
                {message.sender === 'user' ? 'YOU' : 'ASSISTANT'}
              </div>
              <div className={`message-bubble ${message.sender}`}>
                <p>{message.text}</p>
              </div>
              {/* Show ProductRecommendations inline after AI message when showProducts is true */}
              {message.sender === 'assistant' && message.showProducts && (
                <div className="message-bubble assistant products" style={{ marginTop: '8px' }}>
                  <ProductRecommendations 
                    recommendations={message.recommendations || apiRecommendations} 
                    onCompare={handleCompare} 
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-label">ASSISTANT</div>
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

        {/* Device Type Selection Tiles - shown when AI asks what type of device */}
        {!isLoading && awaitingResponse === 'device_type' && (
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

        {/* Price Selection Tiles - continuation of AI message (no duplicate avatar) */}
        {!isLoading && awaitingResponse === 'price_range' && (
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

        {/* Feature Selection Tiles - continuation of AI message (no duplicate avatar) */}
        {!isLoading && conversationStep === 'awaiting_features' && (
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

        {/* Product Recommendations - wrapped in chat message */}
        {conversationStep === 'showing_products' && !isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar" style={{ visibility: 'hidden' }}>
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-label" style={{ visibility: 'hidden' }}>ASSISTANT</div>
              <div className="message-bubble assistant products">
                <ProductRecommendations onCompare={handleCompare} />
              </div>
            </div>
          </div>
        )}

        {/* Inline Comparison - shown in chat */}
        {conversationStep === 'comparing' && selectedProducts.length >= 2 && !isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar" style={{ visibility: 'hidden' }}>
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-label" style={{ visibility: 'hidden' }}>ASSISTANT</div>
              <div className="message-bubble assistant comparison">
                <InlineComparison 
                  selectedIds={selectedProducts} 
                  onRemove={handleRemoveFromComparison}
                  onSelect={handleSelectDeviceForPurchase}
                  onClose={handleCloseComparison}
                />
              </div>
            </div>
          </div>
        )}

        {/* Inline Purchase - shown in chat */}
        {conversationStep === 'purchasing' && purchaseProduct && !isLoading && (
          <div className="message-wrapper assistant">
            <div className="message-avatar assistant-avatar" style={{ visibility: 'hidden' }}>
              <Bot size={20} />
            </div>
            <div className="message-content">
              <div className="message-label" style={{ visibility: 'hidden' }}>ASSISTANT</div>
              <div className="message-bubble assistant purchase">
                <InlinePurchase 
                  product={purchaseProduct}
                  onBack={handleClosePurchase}
                  onBuy={handleFinalBuy}
                  onUpgrade={handleUpgrade}
                />
              </div>
            </div>
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
              className="chat-input"
            />
            {inputValue.trim() ? (
              <button type="submit" className="icon-button send-button">
                <Send size={20} />
              </button>
            ) : (
              <button type="button" className="icon-button mic-button" onClick={() => setIsVoicePopupOpen(true)}>
                <Mic size={20} />
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

      <VoiceInputModal
        isOpen={isVoiceInputOpen}
        onClose={handleCloseVoiceInput}
        onTranscriptComplete={handleVoiceTranscriptComplete}
      />

      <VoicePopup
        isOpen={isVoicePopupOpen}
        onClose={handleCloseVoicePopup}
        userMessage={voiceUserMessage}
        aiResponse={voiceAiResponse}
        onAiFinishedSpeaking={handleAiFinishedSpeaking}
        onTapToSpeak={handleTapToSpeak}
      />
    </div>
  );
}

export default AIShopper;

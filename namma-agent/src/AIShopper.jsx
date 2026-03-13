import { useState, useRef, useEffect } from 'react';
import { QrCode, Mic, Send, Camera, Battery, Gamepad2, Signal, Bot } from 'lucide-react';
import QRScannerModal from './QRScannerModal';
import VoiceInputModal from './VoiceInputModal';
import ProductRecommendations from './ProductRecommendations';
import ProductComparison from './ProductComparison';
import ProductPurchaseScreen from './ProductPurchaseScreen';
import './AIShopper.css';

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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) yield parsed.content;
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
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      text: "What are you looking to buy today?",
      sender: 'assistant',
      timestamp: new Date().toISOString(),
      isWelcome: true,
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectionState, setSelectionState] = useState(null);
  const [cartCount] = useState(2);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  const handleCategoryClick = (category) => {
    handleSendMessage(category);
  };

  const handleSendMessage = async (text) => {
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
      // Build message history for API (only user/assistant roles)
      const apiMessages = messages
        .filter(m => m.sender === 'user' || m.sender === 'assistant')
        .map(m => ({
          role: m.sender,
          content: m.text
        }));

      // Add the new user message
      apiMessages.push({
        role: 'user',
        content: messageText
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
      for await (const chunk of chatApi.streamMessage(apiMessages)) {
        fullText += chunk;
        setMessages((prev) =>
          prev.map(m =>
            m.id === aiMessageId
              ? { ...m, text: fullText }
              : m
          )
        );
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

  const handlePriceSelect = (priceRange) => {
    const selectionMessage = {
      id: Date.now(),
      text: `Selected price range: ${priceRange.label}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setSelectionState({ step: 'features', selectedPrice: priceRange });

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const aiMessage = {
        id: Date.now() + 1,
        text: 'Great! Now select the features that matter most to you.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        showSelections: true,
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 800);
  };

  const handleFeatureSelect = (feature) => {
    const selectionMessage = {
      id: Date.now(),
      text: `Priority: ${feature.label}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, selectionMessage]);
    setSelectionState(null);

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const aiMessage = {
        id: Date.now() + 1,
        text: 'Perfect! I\'ve noted your preferences. Here are some recommendations based on your selections.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        showProducts: true,
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  const handleCompare = (selectedIds) => {
    setSelectedProducts(selectedIds);
    setShowComparison(true);
  };

  const handleCloseComparison = () => {
    setShowComparison(false);
  };

  const handleRemoveFromComparison = (productId) => {
    setSelectedProducts((prev) => prev.filter((id) => id !== productId));
  };

  const handleBuyFromComparison = () => {
    setShowComparison(false);
    setShowPurchase(true);
  };

  const handleClosePurchase = () => {
    setShowPurchase(false);
  };

  const handleFinalBuy = (product) => {
    alert(`Successfully purchased ${product.name} for $${product.price}!`);
    setShowPurchase(false);
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

  const getLastAiMessage = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'assistant') {
        return messages[i];
      }
    }
    return null;
  };

  const lastAiMessage = getLastAiMessage();
  const shouldShowSelections = lastAiMessage?.showSelections && !isLoading;

  return (
    <div className="ai-shopper-container">
      <div className="top-toolbar">
        <div className="toolbar-logo">
          <div className="logo-icon">
            <Bot size={24} />
          </div>
          <span className="logo-text">ShopAI</span>
        </div>
        <div className="toolbar-cart">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
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

        <div className="category-section">
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
        </div>

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

        {shouldShowSelections && selectionState?.step === 'price' && (
          <div className="selection-container">
            <h4 className="selection-title">SELECT PRICE RANGE</h4>
            <div className="price-range-buttons">
              {priceRanges.map((range) => (
                <button
                  key={range.id}
                  className="price-range-button"
                  onClick={() => handlePriceSelect(range)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {shouldShowSelections && selectionState?.step === 'features' && (
          <div className="selection-container">
            <h4 className="selection-title">PRIORITY FEATURES</h4>
            <div className="features-grid">
              {priorityFeatures.map((feature) => {
                const Icon = feature.icon;
                return (
                  <button
                    key={feature.id}
                    className="feature-button"
                    onClick={() => handleFeatureSelect(feature)}
                  >
                    <Icon size={20} />
                    <span>{feature.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {lastAiMessage?.showProducts && !isLoading && (
          <ProductRecommendations onCompare={handleCompare} />
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
              <button type="button" className="icon-button mic-button" onClick={handleOpenVoiceInput}>
                <Mic size={20} />
              </button>
            )}
          </div>
        </form>
      </div>

      {showComparison && (
        <ProductComparison
          selectedIds={selectedProducts}
          onClose={handleCloseComparison}
          onRemove={handleRemoveFromComparison}
          onBuy={handleBuyFromComparison}
        />
      )}

      {showPurchase && (
        <ProductPurchaseScreen
          onBack={handleClosePurchase}
          onBuy={handleFinalBuy}
        />
      )}

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
    </div>
  );
}

export default AIShopper;

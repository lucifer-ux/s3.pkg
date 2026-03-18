import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ChatService {
  constructor() {
    // Initialize OpenAI client pointing to LiteLLM proxy
    this.client = new OpenAI({
      apiKey: process.env.LITELLM_API_KEY || 'sk-test',
      baseURL: process.env.LITELLM_API_URL || 'http://localhost:4000/v1',
    });

    this.defaultModel = process.env.LITELLM_MODEL || 'gpt-4o-mini';
    this.maxTokens = parseInt(process.env.LITELLM_MAX_TOKENS, 10) || 2000;
    this.temperature = parseFloat(process.env.LITELLM_TEMPERATURE) || 0.7;

    // Load product catalog and specification data
    this.products = this.loadProducts();
    this.specifications = this.loadSpecifications();

    // Build system prompt with actual product data
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Load products from products.json
   */
  loadProducts() {
    try {
      // Try multiple possible paths for products.json
      const possiblePaths = [
        path.join(process.cwd(), '..', '..', 'products.json'),
        path.join(process.cwd(), '..', 'products.json'),
        path.join(process.cwd(), 'products.json'),
        path.join(__dirname, '..', '..', '..', '..', 'products.json'),
      ];

      for (const jsonPath of possiblePaths) {
        if (fs.existsSync(jsonPath)) {
          const data = fs.readFileSync(jsonPath, 'utf8');
          return JSON.parse(data);
        }
      }

      console.warn('products.json not found, using empty product catalog');
      return [];
    } catch (error) {
      console.error('Error loading products.json:', error);
      return [];
    }
  }

  /**
   * Load specifications from llmfeed.json
   */
  loadSpecifications() {
    try {
      // Try multiple possible paths for llmfeed.json
      const possiblePaths = [
        path.join(process.cwd(), '..', '..', 'llmfeed.json'),
        path.join(process.cwd(), '..', 'llmfeed.json'),
        path.join(process.cwd(), 'llmfeed.json'),
        path.join(__dirname, '..', '..', '..', '..', 'llmfeed.json'),
      ];

      for (const jsonPath of possiblePaths) {
        if (fs.existsSync(jsonPath)) {
          const data = fs.readFileSync(jsonPath, 'utf8');
          return JSON.parse(data);
        }
      }

      console.warn('llmfeed.json not found, using empty specifications');
      return {};
    } catch (error) {
      console.error('Error loading llmfeed.json:', error);
      return {};
    }
  }

  /**
   * Get available categories from products
   */
  getAvailableCategories() {
    const categories = new Set();
    for (const product of this.products) {
      if (product.category) {
        categories.add(product.category);
      }
    }
    return Array.from(categories);
  }

  /**
   * Get available brands from products
   */
  getAvailableBrands() {
    const brands = new Set();
    for (const product of this.products) {
      if (product.brand) {
        brands.add(product.brand);
      }
    }
    return Array.from(brands);
  }

  /**
   * Search products by name, brand, or category
   */
  searchProducts(query, limit = 10) {
    if (!query || this.products.length === 0) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const product of this.products) {
      const matchScore = this.calculateMatchScore(product, lowerQuery);
      if (matchScore > 0) {
        results.push({ product, score: matchScore });
      }
    }

    // Sort by match score (descending) and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(r => r.product);
  }

  /**
   * Calculate match score for a product against a query
   */
  calculateMatchScore(product, query) {
    let score = 0;

    if (product.name?.toLowerCase().includes(query)) {
      score += 10;
      // Exact match gets higher score
      if (product.name.toLowerCase() === query) {
        score += 5;
      }
    }

    if (product.brand?.toLowerCase().includes(query)) {
      score += 8;
    }

    if (product.category?.toLowerCase().includes(query)) {
      score += 6;
    }

    if (product.description?.toLowerCase().includes(query)) {
      score += 3;
    }

    if (product.highlights) {
      for (const highlight of product.highlights) {
        if (highlight.toLowerCase().includes(query)) {
          score += 2;
          break;
        }
      }
    }

    return score;
  }

  /**
   * Get product by name or ID
   */
  getProduct(identifier) {
    if (!identifier || this.products.length === 0) {
      return null;
    }

    const lowerId = identifier.toLowerCase();

    for (const product of this.products) {
      if (
        product.product_id?.toLowerCase() === lowerId ||
        product.name?.toLowerCase() === lowerId ||
        product.slug?.toLowerCase() === lowerId
      ) {
        return product;
      }
    }

    // Try partial match if exact match not found
    for (const product of this.products) {
      if (
        product.name?.toLowerCase().includes(lowerId) ||
        product.product_id?.toLowerCase().includes(lowerId)
      ) {
        return product;
      }
    }

    return null;
  }

  /**
   * Get products by category
   */
  getProductsByCategory(category, limit = 20) {
    if (!category || this.products.length === 0) {
      return [];
    }

    const lowerCategory = category.toLowerCase();
    const results = [];

    for (const product of this.products) {
      if (product.category?.toLowerCase() === lowerCategory) {
        results.push(product);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Get specification description and example for a category and spec type
   */
  getSpecDescription(category, specType, specValue) {
    if (!this.specifications[category]) {
      return null;
    }

    const categorySpecs = this.specifications[category];

    if (!categorySpecs[specType]) {
      return null;
    }

    // Find matching spec value
    for (const spec of categorySpecs[specType]) {
      const key = Object.keys(spec)[0];
      if (key.toLowerCase() === specValue?.toLowerCase() ||
          key.toLowerCase().replace(/[_\s]/g, '') === specValue?.toLowerCase().replace(/[_\s]/g, '')) {
        return spec[key];
      }
    }

    // Return first matching spec if exact match not found
    if (categorySpecs[specType].length > 0) {
      const firstSpec = categorySpecs[specType][0];
      const key = Object.keys(firstSpec)[0];
      return firstSpec[key];
    }

    return null;
  }

  /**
   * Get all specifications for a category
   */
  getCategorySpecs(category) {
    return this.specifications[category] || null;
  }

  /**
   * Format product for display in conversation
   */
  formatProductForDisplay(product) {
    if (!product) return '';

    const priceInfo = product.skus?.[0]?.price;
    const price = priceInfo
      ? `₹${priceInfo.selling_price?.toLocaleString('en-IN') || priceInfo.mrp?.toLocaleString('en-IN')}`
      : 'Price not available';

    return {
      id: product.product_id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: price,
      rating: product.ratings?.average_rating,
      highlights: product.highlights || [],
      description: product.description,
    };
  }

  /**
   * Build the system prompt with actual product catalog and specifications
   */
  buildSystemPrompt() {
    const categories = this.getAvailableCategories();
    const brands = this.getAvailableBrands();

    let productCatalog = '';
    if (categories.length > 0) {
      productCatalog = `

AVAILABLE PRODUCT CATEGORIES:
${categories.map(cat => `- ${cat}`).join('\n')}

AVAILABLE BRANDS:
${brands.slice(0, 20).join(', ')}${brands.length > 20 ? ' and more...' : ''}

PRODUCT CATALOG HIGHLIGHTS:
We have ${this.products.length} products in our catalog. Here are some popular ones:
${this.products.slice(0, 10).map(p => `- ${p.name} (${p.brand}) - ${p.category}`).join('\n')}`;
    }

    let specGuide = '';
    if (Object.keys(this.specifications).length > 0) {
      specGuide = `

SPECIFICATION GUIDE (use these descriptions and examples when explaining specs to users):

${Object.entries(this.specifications).map(([category, specs]) => {
  return `${category}:\n${Object.entries(specs).map(([specType, specValues]) => {
    const specInfo = specValues[0];
    const key = Object.keys(specInfo)[0];
    return `  ${specType}: ${specInfo[key].description}\n  Example: ${specInfo[key].example}`;
  }).join('\n\n')}`;
}).join('\n\n')}`;
    }

    return `You are Namma, an AI shopping assistant for an Indian e-commerce platform. Your role is to help users find the best products based on their needs, budget, and preferences.

IMPORTANT: Always refer to the conversation history to maintain context. If a user mentions something they told you earlier (like their budget, preferred brand, or use case), remember it and use it in your responses. Ask clarifying questions only when you genuinely need more information.

RESPONSE STYLE - MAX 20 WORDS:
- NEVER exceed 20 words per response
- Count your words before responding
- Be ultra-concise
- Single sentence only
- Do NOT include any reasoning, thinking process, or <thinking> blocks
- Provide only the final response without explanation of how you arrived at it
- Never output internal deliberation or step-by-step thinking

Guidelines:
- Be friendly, helpful, and conversational
- Maintain context from the entire conversation history
- Consider Indian market context (prices in INR, availability, popular brands)
- Provide specific product recommendations from our catalog with reasons
- Compare products using the SPECIFICATION GUIDE below to explain features in relatable terms
- Respect user budget constraints
- Be knowledgeable about mobile phones, laptops, accessories, and electronics
- Use Indian English conventions and be culturally aware
- Keep responses concise but informative
- When comparing products, use real-world examples from the specification guide to help users understand
- If you don't know something, be honest and suggest how the user can find out
- When recommending products, refer to actual products from our catalog${productCatalog}

When explaining specifications, ALWAYS use the descriptions and examples from the SPECIFICATION GUIDE to make technical terms easy to understand. For example:
- Instead of just saying "8GB RAM", explain: "8GB RAM means when switching between YouTube, WhatsApp, and Chrome, most apps stay open and switch smoothly."
- Instead of just saying "5000mAh battery", explain: "A 5000mAh battery usually lasts a full day when using the phone for calls, videos, and social media."
${specGuide}

When making recommendations, consider:
1. Budget constraints (mentioned in conversation history)
2. Priority features (camera, battery, gaming, 5G, etc.)
3. Brand preferences
4. Use case (work, gaming, photography, daily use)
5. Value for money in the Indian market

CRITICAL RULE - Ask ONLY ONE QUESTION AT A TIME:
Your response MUST contain at most ONE question mark (?) per message until you give recommendations.
- If you don't know the category yet: Ask ONLY "What category are you looking for?" - NOTHING ELSE.
- If category is known but budget is unknown: Ask ONLY "What's your budget range?" - NOTHING ELSE.
- If category and budget are known but priorities are unknown: Ask ONLY "What's most important to you?" - NOTHING ELSE.
- ONLY after knowing category + budget + priorities: Provide recommendations.

STRICTLY FORBIDDEN (doing any of these is a FAILURE):
- NEVER ask multiple questions in one response
- NEVER use bullet points (• or -) or numbered lists when asking questions
- NEVER provide a checklist of things to answer
- NEVER say "tell me your: 1) budget, 2) brand, 3) features"
- NEVER include more than one question mark in a message before giving recommendations
- NEVER use bold formatting (**) when asking questions
- NEVER ask "few quick questions" followed by a list

CORRECT EXAMPLES (follow these exactly):
- User: "Hi" → You: "Hi! What category are you looking for?"
- User: "Mobile phones" → You: "Great! What's your budget range?"
- User: "Around 20000" → You: "Thanks! What's most important to you in a phone?"
- User: "Camera" → You: "Got it! Here are my recommendations..."

INCORRECT EXAMPLES (NEVER do these):
- "To help you, a few quick questions: - **Budget** - What's your... - **Brand** - Any..."
- "Could you tell me: 1. budget 2. brand 3. features?"
- "What's your budget? Any preferred brand? What features matter?"
- "Please share: budget, brand, and priorities"

REMEMBER: If your response has more than one question mark (?), YOU HAVE FAILED. Keep it to exactly ONE question until ready to recommend.

Response format for recommendations:
1. Acknowledge user's requirements from conversation context
2. Recommend 3-4 specific products from our catalog with prices
3. Explain why each product fits their needs using relatable examples
4. Provide a clear recommendation based on their priorities`;
  }

  /**
   * Extract relevant context from conversation history for product search
   */
  extractProductContext(messages) {
    const context = {
      category: null,
      brand: null,
      budgetMin: null,
      budgetMax: null,
      features: [],
      useCase: null,
    };

    // Combine all user messages to search for keywords
    const userText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ')
      .toLowerCase();

    // Detect category
    const categoryKeywords = {
      'smartphones': ['phone', 'mobile', 'smartphone', 'cellphone', 'iphone', 'samsung', 'xiaomi', 'oneplus'],
      'laptops': ['laptop', 'notebook', 'macbook', 'computer'],
      'televisions': ['tv', 'television', 'led tv', 'oled tv', 'smart tv'],
      'refrigerators': ['fridge', 'refrigerator', 'freezer'],
      'washingmachines': ['washing machine', 'washer', 'dryer'],
      'airconditioners': ['ac', 'air conditioner', 'cooler'],
      'accessories': ['headphone', 'earphone', 'charger', 'case', 'cable', 'accessory'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => userText.includes(kw))) {
        context.category = category;
        break;
      }
    }

    // Detect budget
    const budgetPattern = /(?:rs\.?|₹|inr|budget|price|under|below|around)\s*[:\s]*([\d,]+(?:\s*(?:k|thousand| lakh)?)?)/gi;
    let match;
    while ((match = budgetPattern.exec(userText)) !== null) {
      const amount = this.parseBudget(match[1]);
      if (amount) {
        if (!context.budgetMin) {
          context.budgetMin = amount;
        } else if (!context.budgetMax) {
          context.budgetMax = amount;
        }
      }
    }

    // Detect brand
    const brands = this.getAvailableBrands();
    for (const brand of brands) {
      if (userText.includes(brand.toLowerCase())) {
        context.brand = brand;
        break;
      }
    }

    // Detect features/use case
    const featureKeywords = [
      'camera', 'battery', 'gaming', '5g', 'display', 'performance',
      'storage', 'ram', 'processor', 'screen', 'fast charging'
    ];
    for (const feature of featureKeywords) {
      if (userText.includes(feature)) {
        context.features.push(feature);
      }
    }

    return context;
  }

  /**
   * Parse budget string to number
   */
  parseBudget(budgetStr) {
    if (!budgetStr) return null;

    const cleanStr = budgetStr.replace(/,/g, '').toLowerCase().trim();

    if (cleanStr.includes('lakh')) {
      const num = parseFloat(cleanStr.replace(/[^\d.]/g, ''));
      return num * 100000;
    }

    if (cleanStr.includes('k') || cleanStr.includes('thousand')) {
      const num = parseFloat(cleanStr.replace(/[^\d.]/g, ''));
      return num * 1000;
    }

    return parseInt(cleanStr.replace(/[^\d]/g, ''), 10) || null;
  }

  /**
   * Build contextual information based on conversation history
   */
  buildContextualInfo(messages) {
    const context = this.extractProductContext(messages);
    let contextInfo = '';

    // Add relevant products based on detected category/brand
    if (context.category || context.brand) {
      let relevantProducts = [];

      if (context.brand) {
        relevantProducts = this.products.filter(p =>
          p.brand?.toLowerCase() === context.brand.toLowerCase()
        );
      }

      if (relevantProducts.length === 0 && context.category) {
        relevantProducts = this.getProductsByCategory(context.category, 5);
      }

      if (relevantProducts.length > 0) {
        contextInfo += `\n\nRELEVANT PRODUCTS FROM CATALOG:\n`;
        relevantProducts.forEach(p => {
          const priceInfo = p.skus?.[0]?.price;
          const price = priceInfo
            ? `₹${priceInfo.selling_price?.toLocaleString('en-IN') || priceInfo.mrp?.toLocaleString('en-IN')}`
            : 'Price N/A';
          contextInfo += `- ${p.name} (${p.brand}): ${price}\n`;
          contextInfo += `  Highlights: ${p.highlights?.slice(0, 3).join(', ') || 'N/A'}\n`;
        });
      }
    }

    // Add spec guide for detected category
    if (context.category && this.specifications[context.category]) {
      contextInfo += `\n\nSPECIFICATION GUIDE FOR ${context.category.toUpperCase()}:\n`;
      const specs = this.specifications[context.category];

      for (const [specType, specValues] of Object.entries(specs)) {
        const firstSpec = specValues[0];
        const key = Object.keys(firstSpec)[0];
        contextInfo += `${specType}: ${firstSpec[key].description}\n`;
      }
    }

    return contextInfo;
  }

  /**
   * Send a chat completion request to LiteLLM
   * @param {Array} messages - Array of message objects {role, content}
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Chat completion response
   */
  async chat(messages, options = {}) {
    try {
      const {
        model = this.defaultModel,
        temperature = this.temperature,
        maxTokens = this.maxTokens,
        stream = false,
        tools = null,
        toolChoice = null,
      } = options;

      // Build contextual information based on conversation history
      const contextualInfo = this.buildContextualInfo(messages);

      // Create enhanced system prompt with context
      const enhancedSystemPrompt = this.systemPrompt + contextualInfo;

      // Ensure system prompt is included
      const fullMessages = [
        { role: 'system', content: enhancedSystemPrompt },
        ...messages,
      ];

      const params = {
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
        stream,
      };

      if (tools) {
        params.tools = tools;
      }

      if (toolChoice) {
        params.tool_choice = toolChoice;
      }

      console.log(`Sending chat request to model: ${model}, stream: ${stream}`);

      const response = await this.client.chat.completions.create(params);

      if (stream) {
        return response; // Returns async iterator for streaming
      }

      let message = response.choices[0].message;

      // Enforce one question at a time
      message = this.enforceOneQuestion(message);

      return {
        message,
        usage: response.usage,
        model: response.model,
        finishReason: response.choices[0].finish_reason,
      };
    } catch (error) {
      console.error('Chat service error:', error);
      throw new Error(`Failed to get chat completion: ${error.message}`);
    }
  }

  /**
   * Enforce "one question at a time" rule on AI response
   * @param {Object} message - The message object from OpenAI
   * @returns {Object} - Modified message with only one question
   */
  enforceOneQuestion(message) {
    if (!message.content) return message;

    const content = message.content;

    // Detect if this is a question-asking response (not a recommendation or comparison)
    const isAskingResponse = /\?|what|which|how much|would you|could you|please tell/i.test(content) &&
      !content.includes('Here are') &&
      !content.includes('I recommend') &&
      !content.includes('Best') &&
      content.length < 500;

    if (!isAskingResponse) return message;

    // Count question marks
    const questionMarks = content.match(/\?/g);
    if (!questionMarks || questionMarks.length <= 1) return message;

    // Find first question mark and truncate there
    const firstQuestionIdx = content.indexOf('?');
    if (firstQuestionIdx === -1) return message;

    // Look for the start of the sentence containing the question
    let sentenceStart = content.lastIndexOf('.', firstQuestionIdx);
    if (sentenceStart === -1) sentenceStart = content.lastIndexOf('\n', firstQuestionIdx);
    if (sentenceStart === -1) sentenceStart = -1;

    // Extract just the first question with its context (previous sentence if exists)
    let truncated = content.substring(0, firstQuestionIdx + 1).trim();

    // Remove incomplete sentences at the end
    truncated = truncated.replace(/[^.?!\n]+$/g, '');

    if (truncated.length > 10) {
      return {
        ...message,
        content: truncated,
      };
    }

    return message;
  }

  /**
   * Stream chat completion with callbacks
   * @param {Array} messages - Array of message objects
   * @param {Object} callbacks - Callbacks for streaming { onChunk, onDone, onError }
   * @param {Object} options - Additional options
   */
  async streamChat(messages, callbacks, options = {}) {
    try {
      const { onChunk, onDone, onError } = callbacks;

      const streamOptions = {
        ...options,
        stream: true,
      };

      const stream = await this.chat(messages, streamOptions);

      let fullContent = '';
      let toolCalls = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          fullContent += delta.content;
          onChunk?.({
            content: delta.content,
            fullContent,
          });
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index || 0;
            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCall.id,
                type: 'function',
                function: { name: toolCall.function?.name, arguments: '' },
              };
            }
            if (toolCall.function?.arguments) {
              toolCalls[index].function.arguments += toolCall.function.arguments;
            }
          }
        }
      }

      // Enforce one question at a time on the final content
      const mockMessage = { content: fullContent };
      const enforcedMessage = this.enforceOneQuestion(mockMessage);

      onDone?.({
        content: enforcedMessage.content,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
      });
    } catch (err) {
      console.error('Stream chat error:', err);
      if (callbacks.onError) {
        callbacks.onError(err);
      }
    }
  }

  /**
   * Get product recommendations based on user preferences
   * @param {Object} preferences - User preferences
   */
  async getRecommendations(preferences) {
    const {
      category,
      budget,
      priorityFeatures,
      brandPreference,
      useCase,
    } = preferences;

    // Find relevant products from catalog
    let relevantProducts = this.getProductsByCategory(category, 10);

    // Filter by budget if provided
    if (budget?.min || budget?.max) {
      relevantProducts = relevantProducts.filter(p => {
        const price = p.skus?.[0]?.price?.selling_price || p.skus?.[0]?.price?.mrp;
        if (!price) return true;
        if (budget.min && price < budget.min) return false;
        if (budget.max && price > budget.max) return false;
        return true;
      });
    }

    // Filter by brand if provided
    if (brandPreference) {
      const brandMatches = relevantProducts.filter(p =>
        p.brand?.toLowerCase() === brandPreference.toLowerCase()
      );
      if (brandMatches.length > 0) {
        relevantProducts = brandMatches;
      }
    }

    // Build product list for prompt
    const productList = relevantProducts.slice(0, 5).map(p => {
      const priceInfo = p.skus?.[0]?.price;
      const price = priceInfo
        ? `₹${priceInfo.selling_price?.toLocaleString('en-IN') || priceInfo.mrp?.toLocaleString('en-IN')}`
        : 'Price N/A';
      return `- ${p.name} (${p.brand}): ${price}
  Highlights: ${p.highlights?.join(', ') || 'N/A'}
  Rating: ${p.ratings?.average_rating || 'N/A'}/5 (${p.ratings?.total_reviews || 0} reviews)`;
    }).join('\n\n');

    // Get spec guide for category
    let specGuide = '';
    if (this.specifications[category]) {
      specGuide = `\n\nUse these specifications to explain features:\n`;
      const specs = this.specifications[category];
      for (const [specType, specValues] of Object.entries(specs)) {
        const firstSpec = specValues[0];
        const key = Object.keys(firstSpec)[0];
        specGuide += `- ${specType}: ${firstSpec[key].description}\n`;
      }
    }

    const messages = [
      {
        role: 'user',
        content: `I need recommendations for ${category}.
Budget: ₹${budget?.min || 'no minimum'} - ${budget?.max ? '₹' + budget.max : 'no upper limit'}
Priority features: ${priorityFeatures?.join(', ') || 'none specified'}
${brandPreference ? `Preferred brands: ${brandPreference}` : ''}
${useCase ? `Use case: ${useCase}` : ''}

Available products from our catalog that match these criteria:
${productList || 'No specific products found in catalog.'}${specGuide}

Please recommend 3-4 specific products from the catalog above with:
1. Brief explanation for each recommendation
2. How it fits their budget and needs
3. Use relatable examples when explaining specifications`,
      },
    ];

    return this.chat(messages, {
      temperature: 0.8,
    });
  }

  /**
   * Compare two or more products
   * @param {Array} productIds - Array of product IDs to compare
   * @param {string} category - Product category
   */
  async compareProducts(productIds, category) {
    // Fetch actual product details from catalog
    const productsToCompare = [];
    for (const id of productIds) {
      const product = this.getProduct(id);
      if (product) {
        productsToCompare.push(product);
      }
    }

    // Build product details for prompt
    let productDetails = '';
    if (productsToCompare.length > 0) {
      productDetails = productsToCompare.map(p => {
        const priceInfo = p.skus?.[0]?.price;
        const price = priceInfo
          ? `₹${priceInfo.selling_price?.toLocaleString('en-IN') || priceInfo.mrp?.toLocaleString('en-IN')}`
          : 'Price N/A';
        return `PRODUCT: ${p.name}
Brand: ${p.brand}
Price: ${price}
Rating: ${p.ratings?.average_rating || 'N/A'}/5
Description: ${p.description || 'N/A'}
Highlights: ${p.highlights?.join(', ') || 'N/A'}
Options: ${JSON.stringify(p.options) || 'N/A'}`;
      }).join('\n\n---\n\n');
    } else {
      productDetails = 'Products not found in catalog. Compare based on general knowledge.';
    }

    // Get spec guide for category
    let specGuide = '';
    if (this.specifications[category]) {
      specGuide = `\n\nUse these relatable examples when explaining specifications:\n`;
      const specs = this.specifications[category];
      for (const [specType, specValues] of Object.entries(specs).slice(0, 5)) {
        const firstSpec = specValues[0];
        const key = Object.keys(firstSpec)[0];
        specGuide += `- ${specType}: ${firstSpec[key].description}\n  Example: ${firstSpec[key].example}\n`;
      }
    }

    const messages = [
      {
        role: 'user',
        content: `Please compare these ${category} products: ${productIds.join(', ')}.

${productsToCompare.length > 0 ? 'Here are the actual product details from our catalog:\n\n' + productDetails : productDetails}${specGuide}

Provide a detailed comparison covering:
1. Key specifications (use relatable examples from above)
2. Pros and cons of each
3. Value for money analysis
4. Which one is better for different use cases
5. Your recommendation

When explaining specs, always use the real-world examples to make it easy to understand.`,
      },
    ];

    return this.chat(messages, {
      temperature: 0.6,
    });
  }

  /**
   * Get product details and information
   * @param {string} productName - Product name
   * @param {string} category - Product category
   */
  async getProductDetails(productName, category) {
    // Try to find the product in catalog
    const product = this.getProduct(productName);

    let productContext = '';
    if (product) {
      const priceInfo = product.skus?.[0]?.price;
      const price = priceInfo
        ? `₹${priceInfo.selling_price?.toLocaleString('en-IN') || priceInfo.mrp?.toLocaleString('en-IN')}`
        : 'Price N/A';

      productContext = `Here is the actual product information from our catalog:

Product: ${product.name}
Brand: ${product.brand}
Category: ${product.category}
Price: ${price}
Rating: ${product.ratings?.average_rating || 'N/A'}/5 (${product.ratings?.total_reviews || 0} reviews)
Description: ${product.description || 'N/A'}
Highlights: ${product.highlights?.join(', ') || 'N/A'}
Available Options: ${JSON.stringify(product.options) || 'N/A'}

Top Review: ${product.reviews?.[0] ? `"${product.reviews[0].review_text}" - ${product.reviews[0].user_name}, ${product.reviews[0].rating}/5 stars` : 'No reviews available'}

Based on this product data, provide a comprehensive overview.`;
    }

    // Get spec guide for category
    let specGuide = '';
    if (this.specifications[category]) {
      specGuide = `\n\nUse these relatable examples when explaining specifications:\n`;
      const specs = this.specifications[category];
      for (const [specType, specValues] of Object.entries(specs).slice(0, 5)) {
        const firstSpec = specValues[0];
        const key = Object.keys(firstSpec)[0];
        specGuide += `- ${specType}: ${firstSpec[key].description}\n  Example: ${firstSpec[key].example}\n`;
      }
    }

    const messages = [
      {
        role: 'user',
        content: `Tell me about the ${productName} (${category}).

${productContext || 'Product not found in catalog. Provide general information.'}${specGuide}

Include:
1. Key specifications (explain with relatable examples)
2. Standout features
3. Pros and cons
4. Who should buy this
5. Price and value analysis

Make technical specifications easy to understand using real-world examples.`,
      },
    ];

    return this.chat(messages);
  }

  /**
   * Generate a conversation title based on messages
   * @param {Array} messages - Chat messages
   */
  async generateTitle(messages) {
    try {
      const titleMessages = [
        ...messages.slice(0, 4), // Use first 4 messages for context
        {
          role: 'user',
          content: 'Generate a short, descriptive title (3-5 words) for this conversation about shopping. Just return the title, nothing else.',
        },
      ];

      const response = await this.chat(titleMessages, {
        maxTokens: 20,
        temperature: 0.5,
      });

      return response.message.content.trim().replace(/["']/g, '');
    } catch (error) {
      console.error('Generate title error:', error);
      return 'Shopping Chat';
    }
  }

  /**
   * Check if LiteLLM is available
   */
  async healthCheck() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      });

      return {
        status: 'ok',
        model: response.model,
        latency: response.response_ms || 'unknown',
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Get available models from LiteLLM
   */
  async getAvailableModels() {
    try {
      const models = await this.client.models.list();
      return models.data.map(m => ({
        id: m.id,
        name: m.id,
      }));
    } catch (error) {
      console.error('Get models error:', error);
      return [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'gemini-pro', name: 'Gemini Pro' },
      ];
    }
  }

  async loanAssistantChat(messages, context = {}) {
    const loanSystemPrompt = `You are a helpful loan assistant for a credit marketplace in India. Your goal is to help users apply for personal loans, consumer durable loans, and credit cards.

You are currently helping a user${context.productName ? ` who wants to finance a ${context.productName} priced at ${context.productPrice}` : ''}.

Current user context:
- Phone: ${context.phoneNumber || 'Not provided'}
- PAN: ${context.panNumber || 'Not provided'}
- Name: ${context.userName || 'Not provided'}
- Step: ${context.currentStep || 'initial'}

Guidelines:
- Be conversational, friendly, and professional
- Guide users through the loan application step by step
- Ask for one piece of information at a time
- When showing loan offers, present them clearly with key details (amount, interest rate, EMI, tenure)
- Keep responses concise (2-3 sentences max)
- If user provides PAN, acknowledge it and move to next step
- If user asks about a specific loan, provide relevant details
- Use Indian Rupee (INR) format for amounts
- Be encouraging and reassuring about the process

Available loan types:
1. Personal Loan - up to 5 lakhs, interest 10-15%, tenure 12-60 months
2. Consumer Durable Loan - up to 2 lakhs, 0% interest schemes available, tenure 3-12 months
3. Credit Card - limits up to 1.5 lakhs, various rewards programs

Respond naturally as if chatting with the user.`;

    try {
      const fullMessages = [
        { role: 'system', content: loanSystemPrompt },
        ...messages
      ];

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: fullMessages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return {
        success: true,
        message: response.choices[0].message.content,
        model: response.model,
        usage: response.usage,
      };
    } catch (error) {
      console.error('Loan chat error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new ChatService();

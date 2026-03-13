import OpenAI from 'openai';

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

    // System prompt for the shopping assistant
    this.systemPrompt = `You are Namma, an AI shopping assistant for an Indian e-commerce platform. Your role is to help users find the best products based on their needs, budget, and preferences.

Guidelines:
- Be friendly, helpful, and conversational
- Ask clarifying questions to understand user needs
- Consider Indian market context (prices in INR, availability, popular brands)
- Provide specific product recommendations with reasons
- Compare products when users are deciding between options
- Respect user budget constraints
- Be knowledgeable about mobile phones, laptops, accessories, and electronics
- Use Indian English conventions and be culturally aware
- Keep responses concise but informative
- If you don't know something, be honest and suggest how the user can find out

Current product categories available:
- Mobile phones (iPhone, Samsung, Xiaomi, OnePlus, Google Pixel, etc.)
- Laptops (Dell, HP, Lenovo, MacBook, ASUS, etc.)
- Accessories (headphones, chargers, cases, etc.)

When making recommendations, consider:
1. Budget constraints
2. Priority features (camera, battery, gaming, 5G, etc.)
3. Brand preferences
4. Use case (work, gaming, photography, daily use)
5. Value for money in the Indian market`;
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

      // Ensure system prompt is included
      const fullMessages = [
        { role: 'system', content: this.systemPrompt },
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

      return {
        message: response.choices[0].message,
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

      onDone?.({
        content: fullContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
      });
    } catch (error) {
      console.error('Stream chat error:', error);
      onError?.(error);
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

    const messages = [
      {
        role: 'user',
        content: `I need recommendations for ${category}.
Budget: ₹${budget.min} - ${budget.max ? '₹' + budget.max : 'no upper limit'}
Priority features: ${priorityFeatures?.join(', ') || 'none specified'}
${brandPreference ? `Preferred brands: ${brandPreference}` : ''}
${useCase ? `Use case: ${useCase}` : ''}

Please recommend 3-4 specific products with brief explanations for each.`,
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
    const messages = [
      {
        role: 'user',
        content: `Please compare these ${category} products: ${productIds.join(', ')}.

Provide a detailed comparison covering:
1. Key specifications
2. Pros and cons of each
3. Value for money analysis
4. Which one is better for different use cases
5. Your recommendation`,
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
    const messages = [
      {
        role: 'user',
        content: `Tell me about the ${productName} (${category}).

Include:
1. Key specifications
2. Standout features
3. Pros and cons
4. Who should buy this
5. Price range in India`,
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
      // Return default models if API fails
      return [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'gemini-pro', name: 'Gemini Pro' },
      ];
    }
  }
}

export default new ChatService();

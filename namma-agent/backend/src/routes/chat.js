import express from 'express';
import chatService from '../services/chatService.js';

const router = express.Router();

/**
 * POST /api/chat
 * Send a chat message and get AI response
 * Body: { messages: Array<{role, content}>, options?: Object }
 */
router.post('/', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return res.status(400).json({
          error: 'Each message must have role and content properties',
        });
      }
    }

    const response = await chatService.chat(messages, options);

    res.json({
      success: true,
      message: response.message,
      usage: response.usage,
      model: response.model,
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get chat response',
      message: error.message,
    });
  }
});

/**
 * POST /api/chat/stream
 * Stream chat response (Server-Sent Events)
 * Body: { messages: Array<{role, content}>, options?: Object }
 */
router.post('/stream', async (req, res) => {
  try {
    const { messages, options = {} } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const callbacks = {
      onChunk: (data) => {
        res.write(`data: ${JSON.stringify({ type: 'chunk', ...data })}\n\n`);
      },
      onDone: (data) => {
        res.write(`data: ${JSON.stringify({ type: 'done', ...data })}\n\n`);
        res.end();
      },
      onError: (error) => {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          message: error.message,
        })}\n\n`);
        res.end();
      },
    };

    await chatService.streamChat(messages, callbacks, options);
  } catch (error) {
    console.error('Chat stream endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Failed to stream chat response',
        message: error.message,
      });
    } else {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: error.message,
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/chat/recommendations
 * Get product recommendations
 * Body: { category, budget: {min, max}, priorityFeatures?, brandPreference?, useCase? }
 */
router.post('/recommendations', async (req, res) => {
  try {
    const preferences = req.body;

    if (!preferences.category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    if (!preferences.budget) {
      return res.status(400).json({ error: 'Budget information is required' });
    }

    const response = await chatService.getRecommendations(preferences);

    res.json({
      success: true,
      recommendations: response.message.content,
      usage: response.usage,
      model: response.model,
    });
  } catch (error) {
    console.error('Recommendations endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get recommendations',
      message: error.message,
    });
  }
});

/**
 * POST /api/chat/compare
 * Compare products
 * Body: { productIds: string[], category: string }
 */
router.post('/compare', async (req, res) => {
  try {
    const { productIds, category } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({
        error: 'At least 2 product IDs are required for comparison',
      });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const response = await chatService.compareProducts(productIds, category);

    res.json({
      success: true,
      comparison: response.message.content,
      usage: response.usage,
    });
  } catch (error) {
    console.error('Compare endpoint error:', error);
    res.status(500).json({
      error: 'Failed to compare products',
      message: error.message,
    });
  }
});

/**
 * POST /api/chat/product-details
 * Get product details
 * Body: { productName: string, category: string }
 */
router.post('/product-details', async (req, res) => {
  try {
    const { productName, category } = req.body;

    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }

    const response = await chatService.getProductDetails(productName, category);

    res.json({
      success: true,
      details: response.message.content,
      usage: response.usage,
    });
  } catch (error) {
    console.error('Product details endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get product details',
      message: error.message,
    });
  }
});

/**
 * POST /api/chat/title
 * Generate conversation title
 * Body: { messages: Array<{role, content}> }
 */
router.post('/title', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const title = await chatService.generateTitle(messages);

    res.json({
      success: true,
      title,
    });
  } catch (error) {
    console.error('Generate title endpoint error:', error);
    res.status(500).json({
      error: 'Failed to generate title',
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/models
 * Get available models from LiteLLM
 */
router.get('/models', async (req, res) => {
  try {
    const models = await chatService.getAvailableModels();

    res.json({
      success: true,
      models,
      default: models.find(m =>
        m.id === (process.env.LITELLM_MODEL || 'gpt-4o-mini')
      ) || models[0],
    });
  } catch (error) {
    console.error('Get models endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get models',
      message: error.message,
    });
  }
});

/**
 * GET /api/chat/health
 * Health check for LiteLLM connection
 */
router.get('/health', async (req, res) => {
  try {
    const health = await chatService.healthCheck();

    if (health.status === 'ok') {
      res.json({
        success: true,
        status: 'healthy',
        ...health,
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        ...health,
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;

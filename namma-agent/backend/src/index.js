import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// OpenAI client configured for LiteLLM
const openai = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY || 'sk-test',
  baseURL: process.env.LITELLM_API_URL || 'http://localhost:4000/v1',
});

const DEFAULT_MODEL = process.env.LITELLM_MODEL || 'gpt-4o-mini';

// Load products data
let products = [];
let productsByCategory = {};

try {
  const productsPath = path.join(__dirname, '..', '..', 'products.json');
  const productsData = fs.readFileSync(productsPath, 'utf-8');
  products = JSON.parse(productsData);

  // Group by category
  productsByCategory = products.reduce((acc, product) => {
    const cat = product.category?.toLowerCase() || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  console.log(`Loaded ${products.length} products`);
} catch (error) {
  console.error('Error loading products:', error.message);
}

// Get categories and brands
function getAvailableCategories() {
  return Object.keys(productsByCategory);
}

function getAvailableBrands() {
  const brands = new Set(products.map(p => p.brand).filter(Boolean));
  return Array.from(brands).sort();
}

// Get products by category (case insensitive)
function getProductsByCategory(category, limit = 5) {
  if (!category) return [];
  const cat = category.toLowerCase();
  // Try exact match first, then try capitalized version
  const products = productsByCategory[cat] ||
                   productsByCategory[cat.charAt(0).toUpperCase() + cat.slice(1)] ||
                   [];
  return products.slice(0, limit);
}

// Format product for display
function formatProductForDisplay(product) {
  if (!product) return null;
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
    numericPrice: priceInfo?.selling_price || priceInfo?.mrp || 0,
    rating: product.ratings?.average_rating,
    highlights: product.highlights || [],
    description: product.description,
    image: product.assets?.main_image?.url_medium || 'https://placehold.co/400x300?text=No+Image',
  };
}

// Extract context from messages
function extractContext(messages) {
  const context = { category: null, budget: null, priorities: null, brand: null };
  const allText = messages.map(m => m.content).join(' ').toLowerCase();

  // Detect category - map to actual category names in products.json
  if (allText.includes('mobile') || allText.includes('phone') || allText.includes('smartphone')) {
    context.category = 'smartphones';
  } else if (allText.includes('laptop')) {
    context.category = 'laptops';
  } else if (allText.includes('tv') || allText.includes('television')) {
    context.category = 'televisions';
  } else if (allText.includes('tablet')) {
    context.category = 'tablets';
  } else if (allText.includes('watch')) {
    context.category = 'smartwatches';
  }

  // Detect budget
  const budgetMatch = allText.match(/(\d{4,6})/);
  if (budgetMatch) {
    const num = parseInt(budgetMatch[1]);
    if (num < 1000) context.budget = num * 1000;
    else context.budget = num;
  }

  // Detect brand preference
  const brands = ['samsung', 'apple', 'iphone', 'oneplus', 'xiaomi', 'redmi', 'realme', 'oppo', 'vivo', 'google', 'pixel', 'nothing'];
  for (const brand of brands) {
    if (allText.includes(brand)) {
      if (brand === 'iphone') context.brand = 'Apple';
      else if (brand === 'pixel') context.brand = 'Google';
      else context.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
      break;
    }
  }

  return context;
}

// Get recommendations based on context
function getRecommendations(context) {
  if (!context.category) return [];

  let relevantProducts = getProductsByCategory(context.category, 50);

  // Filter by brand if specified
  if (context.brand) {
    const brandMatches = relevantProducts.filter(p =>
      p.brand?.toLowerCase() === context.brand.toLowerCase()
    );
    // If we have brand matches, use them; otherwise fall back to all products
    if (brandMatches.length > 0) {
      relevantProducts = brandMatches;
    }
  }

  // Filter by budget (wider range: 50% to 150% of budget)
  if (context.budget) {
    const minBudget = context.budget * 0.5;
    const maxBudget = context.budget * 1.5;
    relevantProducts = relevantProducts.filter(p => {
      const price = p.skus?.[0]?.price?.selling_price || p.skus?.[0]?.price?.mrp;
      if (!price) return true;
      return price >= minBudget && price <= maxBudget;
    });
  }

  // Sort by price closest to budget
  if (context.budget) {
    relevantProducts.sort((a, b) => {
      const priceA = a.skus?.[0]?.price?.selling_price || a.skus?.[0]?.price?.mrp || 0;
      const priceB = b.skus?.[0]?.price?.selling_price || b.skus?.[0]?.price?.mrp || 0;
      const diffA = Math.abs(priceA - context.budget);
      const diffB = Math.abs(priceB - context.budget);
      return diffA - diffB;
    });
  }

  // Return top 4
  return relevantProducts.slice(0, 4).map(formatProductForDisplay).filter(Boolean);
}

// Enforce one question at a time
function enforceOneQuestion(content) {
  if (!content) return content;

  // Don't enforce on recommendations
  if (content.includes('Here') && content.includes('recommend')) return content;
  if (content.length > 500) return content;

  const questionMarks = content.match(/\?/g);
  if (!questionMarks || questionMarks.length <= 1) return content;

  // Find first question mark
  const firstQuestionIdx = content.indexOf('?');
  if (firstQuestionIdx === -1) return content;

  // Extract up to first question
  let truncated = content.substring(0, firstQuestionIdx + 1).trim();

  // Find start of that sentence
  const sentenceStart = Math.max(
    truncated.lastIndexOf('.', firstQuestionIdx - 1),
    truncated.lastIndexOf('\n', firstQuestionIdx - 1),
    truncated.lastIndexOf('!', firstQuestionIdx - 1)
  );

  if (sentenceStart > 0) {
    truncated = truncated.substring(sentenceStart + 1).trim();
  }

  return truncated || content;
}

// Build system prompt
function buildSystemPrompt() {
  const categories = getAvailableCategories();
  const brands = getAvailableBrands();

  return `You are Namma, an AI shopping assistant for an Indian e-commerce platform.

AVAILABLE CATEGORIES:
${categories.map(c => `- ${c}`).join('\n')}

POPULAR BRANDS:
${brands.slice(0, 15).join(', ')}

CRITICAL RULE - Ask ONLY ONE QUESTION AT A TIME:
- First, ask ONLY: "What category are you looking for? (mobiles, laptops, TVs, etc.)"
- After they answer, ask ONLY: "What's your budget range?"
- After budget, ask ONLY: "What's most important to you? (camera, battery, gaming, etc.)"
- ONLY then give recommendations using [RECOMMENDATIONS_READY] tag

STRICTLY FORBIDDEN:
- NEVER ask multiple questions in one message
- NEVER use bullet points or numbered lists when asking questions
- NEVER include more than one question mark per message before giving recommendations
- NEVER ask "few quick questions" followed by a list

WHEN READY TO RECOMMEND:
End your response with [RECOMMENDATIONS_READY] on its own line. This will trigger product cards.

CORRECT EXAMPLES:
- "What category are you looking for?"
- "What's your budget range?"
- "What's most important to you?"
- "Perfect! Here are my recommendations. [RECOMMENDATIONS_READY]"

INCORRECT (NEVER DO THIS):
- "Could you tell me: 1) budget 2) brand 3) features?"
- "What budget? Any brand preference? What features?"`;
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5175',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', products: products.length });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = DEFAULT_MODEL } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const systemPrompt = buildSystemPrompt();

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    let content = response.choices[0].message.content;

    // Check if we should show recommendations
    // Either has the tag OR has context (category + budget) and is not asking a question
    const hasRecommendationsTag = content.includes('[RECOMMENDATIONS_READY]');
    const context = extractContext(messages);
    const hasContext = context.category && context.budget;
    const isAskingQuestion = content.includes('?') && content.length < 300;

    let recommendations = [];

    if (hasRecommendationsTag || (hasContext && !isAskingQuestion)) {
      recommendations = getRecommendations(context);
      content = content.replace('[RECOMMENDATIONS_READY]', '').trim();
    }

    // Enforce one question
    content = enforceOneQuestion(content);

    res.json({
      message: { role: 'assistant', content },
      recommendations: recommendations,
      showProducts: recommendations.length > 0,
      model: response.model,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stream chat endpoint (SSE)
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, model = DEFAULT_MODEL } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const systemPrompt = buildSystemPrompt();

    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        res.write(`data: ${JSON.stringify({ content }) }\n\n`);
      }
    }

    // Check if we should show recommendations
    const hasRecommendationsTag = fullContent.includes('[RECOMMENDATIONS_READY]');
    const context = extractContext(messages);
    const hasContext = context.category && context.budget;
    const isAskingQuestion = fullContent.includes('?') && fullContent.length < 300;
    let recommendations = [];

    if (hasRecommendationsTag || (hasContext && !isAskingQuestion)) {
      recommendations = getRecommendations(context);
      fullContent = fullContent.replace('[RECOMMENDATIONS_READY]', '').trim();
    }

    // Enforce one question
    fullContent = enforceOneQuestion(fullContent);

    // Send final data with recommendations
    res.write(`data: ${JSON.stringify({ done: true, recommendations, showProducts: recommendations.length > 0, fullContent }) }\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message }) }\n\n`);
    res.end();
  }
});

// Get products endpoint
app.get('/api/products', (req, res) => {
  const { category, limit = 10 } = req.query;
  const prods = getProductsByCategory(category, parseInt(limit));
  res.json({ products: prods.map(formatProductForDisplay) });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`LiteLLM URL: ${process.env.LITELLM_API_URL || 'http://localhost:4000/v1'}`);
  console.log(`Loaded ${products.length} products`);
});

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import ocrRoutes from './routes/ocr.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pollyRoutes from './routes/polly.js';
import transcribeRoutes from './routes/transcribe.js';
import loanRoutes from './routes/loan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Import routes after dotenv config


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

RESPONSE STYLE - MAX 20 WORDS:
- NEVER exceed 20 words per response
- Count your words before responding
- Be ultra-concise
- Single sentence only

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/polly', pollyRoutes);
app.use('/api/transcribe', transcribeRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/loan', loanRoutes);

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
      max_tokens: 50,
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

app.use('/api/ocr', ocrRoutes);

// Get products endpoint
app.get('/api/products', (req, res) => {
  const { category, limit = 10 } = req.query;
  const prods = getProductsByCategory(category, parseInt(limit));
  res.json({ products: prods.map(formatProductForDisplay) });
// Clean response by removing thinking tokens and system content
});

function cleanResponse(text) {
  if (!text) return text;

  // Remove common thinking/reasoning patterns
  let cleaned = text
    // Remove content between <thinking> tags
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    // Remove content between <reasoning> tags
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    // Remove content between <thought> tags
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    // Remove "Thinking:" or "Reasoning:" sections
    .replace(/^(Thinking|Reasoning|Thought):[\s\S]*?(?=(\n\n|Answer:|Response:|$))/i, '')
    // Remove "Answer:" or "Response:" prefixes
    .replace(/^(Answer|Response):\s*/i, '')
    // Trim whitespace
    .trim();

  return cleaned;
}

// Aggressive cleanup for summaries - removes explanation patterns
function cleanSummary(text) {
  if (!text) return text;

  let cleaned = text;

  // Remove everything after instruction keywords (model repeating system prompt)
  const cutOffPatterns = [
    /\n\s*-\s*Reply with ONLY/i,
    /\n\s*-\s*No thinking/i,
    /\n\s*-\s*Never explain/i,
    /\n\s*Reply with ONLY/i,
    /\n\s*No thinking/i,
    /\n\s*Never explain/i,
    /Reply with ONLY the summary/i,
    /No thinking, no explanations/i,
    /Your ONLY output is/i,
  ];

  for (const pattern of cutOffPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.substring(0, match.index).trim();
    }
  }

  // Remove lines that look like explanations of what the model is doing
  const explanationPatterns = [
    /^The user wants/i,
    /^I need to/i,
    /^I should/i,
    /^I'll/i,
    /^Let me/i,
    /^First,?/i,
    /^Okay,?/i,
    /^So,?/i,
    /^Here('s| is)/i,
    /^To summarize/i,
    /^Key points/i,
    /^Drafting/i,
    /^Option \d/i,
    /^-\s+(Be|Keep|Focus|Do|Speak|Reply|No|Never)/i,
    /^\d+\./,
  ];

  // Split into lines and filter out explanation lines
  const lines = cleaned.split('\n');
  const goodLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let isBad = false;
    for (const pattern of explanationPatterns) {
      if (pattern.test(trimmed)) {
        isBad = true;
        break;
      }
    }
    if (!isBad) {
      goodLines.push(trimmed);
    }
  }

  cleaned = goodLines.join(' ').trim();

  // If we filtered too much, return original with basic cleanup
  if (cleaned.length < 20 && text.length > 50) {
    // Take first sentence only
    const firstSentence = text.split(/[.!?]\s+/)[0];
    return firstSentence ? firstSentence + '.' : text.replace(/\n/g, ' ').trim();
  }

  return cleaned;
}

// Summarize text for voice endpoint
app.post('/api/summarize-for-voice', async (req, res) => {
  try {
    const { text, model = DEFAULT_MODEL } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // First clean the response
    const cleanedText = cleanResponse(text);

    // Only summarize if text is long enough
    if (cleanedText.length < 150) {
      console.log('Text is short enough, skipping summarization');
      return res.json({
        original: text,
        cleaned: cleanedText,
        summary: cleanedText,
        characters: cleanedText.length,
      });
    }

    // Simple extraction: take first 2 sentences from the greeting/question
    // Remove markdown and normalize whitespace
    let simplified = cleanedText
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into sentences and take first 2 meaningful ones
    const sentences = simplified
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && !s.match(/^\d+\./));

    let summary;
    if (sentences.length >= 2) {
      summary = sentences.slice(0, 2).join(' ');
    } else if (sentences.length === 1) {
      summary = sentences[0];
    } else {
      summary = simplified.substring(0, 200);
    }

    // Ensure summary doesn't end mid-sentence
    if (summary.length > 250) {
      const lastPeriod = summary.lastIndexOf('.', 250);
      if (lastPeriod > 100) {
        summary = summary.substring(0, lastPeriod + 1);
      }
    }

    console.log('Original text length:', text.length);
    console.log('Summary:', summary);

    res.json({
      original: text,
      cleaned: cleanedText,
      summary,
      characters: summary.length,
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`LiteLLM URL: ${process.env.LITELLM_API_URL || 'http://localhost:4000/v1'}`);
  console.log(`Loaded ${products.length} products`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import ocrRoutes from './routes/ocr.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// OpenAI client configured for LiteLLM
const openai = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY || 'sk-test',
  baseURL: process.env.LITELLM_API_URL || 'http://localhost:4000/v1',
});

const DEFAULT_MODEL = process.env.LITELLM_MODEL || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are Namma, a helpful AI shopping assistant. Help users find products, compare options, and make purchase decisions. Be conversational, friendly, and concise. Ask clarifying questions when needed to understand what the user is looking for.`;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, model = DEFAULT_MODEL } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    res.json({
      message: response.choices[0].message,
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

    const stream = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.use('/api/ocr', ocrRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`LiteLLM URL: ${process.env.LITELLM_API_URL || 'http://localhost:4000/v1'}`);
});

import express from 'express';
import pollyService from '../services/pollyService.js';

const router = express.Router();

/**
 * POST /api/polly/synthesize
 * Synthesize text to speech
 * Body: { text: string, voiceId?: string, engine?: string, useSSML?: boolean }
 */
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voiceId, engine, useSSML = false, languageCode } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    if (text.length > 3000) {
      return res.status(400).json({ error: 'Text exceeds maximum length of 3000 characters' });
    }

    const options = {
      voiceId,
      engine,
      languageCode,
    };

    // Enhance with SSML if requested
    const textToSynthesize = useSSML
      ? pollyService.enhanceWithSSML(text)
      : text;

    const result = await pollyService.synthesizeSpeech(textToSynthesize, options);

    // Set appropriate headers
    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.audioBuffer.length,
      'X-Request-Characters': result.requestCharacters,
    });

    // Send audio buffer
    res.send(result.audioBuffer);
  } catch (error) {
    console.error('Synthesize endpoint error:', error);
    res.status(500).json({
      error: 'Failed to synthesize speech',
      message: error.message,
    });
  }
});

/**
 * POST /api/polly/synthesize/stream
 * Synthesize text and return base64 encoded audio (for WebSocket-like scenarios)
 * Body: { text: string, voiceId?: string, engine?: string }
 */
router.post('/synthesize/stream', async (req, res) => {
  try {
    const { text, voiceId, engine, languageCode } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required and must be a string' });
    }

    const options = {
      voiceId,
      engine,
      languageCode,
      outputFormat: 'mp3',
    };

    const result = await pollyService.synthesizeSpeech(text, options);

    // Convert to base64 for easy frontend consumption
    const base64Audio = result.audioBuffer.toString('base64');

    res.json({
      success: true,
      audio: `data:${result.contentType};base64,${base64Audio}`,
      characters: result.requestCharacters,
      format: 'mp3',
    });
  } catch (error) {
    console.error('Synthesize stream endpoint error:', error);
    res.status(500).json({
      error: 'Failed to synthesize speech',
      message: error.message,
    });
  }
});

/**
 * GET /api/polly/voices
 * Get available voices
 * Query: ?languageCode=en-IN
 */
router.get('/voices', async (req, res) => {
  try {
    const { languageCode } = req.query;

    const voices = await pollyService.getVoices(languageCode);

    res.json({
      success: true,
      voices,
      count: voices.length,
    });
  } catch (error) {
    console.error('Get voices endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get voices',
      message: error.message,
    });
  }
});

/**
 * GET /api/polly/voices/recommended
 * Get recommended voices for the application
 */
router.get('/voices/recommended', (req, res) => {
  try {
    const voices = pollyService.getRecommendedVoices();

    res.json({
      success: true,
      voices,
      default: voices.find(v => v.recommended) || voices[0],
    });
  } catch (error) {
    console.error('Get recommended voices endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get recommended voices',
      message: error.message,
    });
  }
});

/**
 * POST /api/polly/speak-chat-message
 * Specialized endpoint for chat message synthesis
 * Body: { message: string, isAssistant?: boolean }
 */
router.post('/speak-chat-message', async (req, res) => {
  try {
    const { message, isAssistant = true } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Clean up the message (remove markdown, emojis, etc. for better speech)
    const cleanMessage = message
      .replace(/[#*_~`]/g, '') // Remove markdown
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Remove emojis
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert markdown links to text
      .trim();

    // Use appropriate voice based on sender
    const options = {
      voiceId: isAssistant ? 'Kajal' : 'Joanna',
      engine: 'neural',
      languageCode: 'en-IN',
    };

    const result = await pollyService.synthesizeSpeech(cleanMessage, options);

    // Convert to base64
    const base64Audio = result.audioBuffer.toString('base64');

    res.json({
      success: true,
      audio: `data:${result.contentType};base64,${base64Audio}`,
      originalMessage: message,
      cleanMessage,
      voice: options.voiceId,
    });
  } catch (error) {
    console.error('Speak chat message endpoint error:', error);
    res.status(500).json({
      error: 'Failed to synthesize chat message',
      message: error.message,
    });
  }
});

export default router;

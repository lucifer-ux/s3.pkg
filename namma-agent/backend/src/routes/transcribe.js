import express from 'express';
import multer from 'multer';
import transcribeService from '../services/transcribeService.js';

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedTypes = [
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/raw',
      'audio/pcm',
    ];

    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only audio files are allowed.`));
    }
  },
});

/**
 * POST /api/transcribe
 * Transcribe uploaded audio file
 * FormData: { audio: File, languageCode?: string }
 */
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { languageCode = 'en-IN', sampleRate = '16000' } = req.body;

    console.log(`Received audio file: ${req.file.originalname}, size: ${req.file.size} bytes`);

    // Get audio buffer
    const audioBuffer = req.file.buffer;

    // Determine format from mimetype
    const format = req.file.mimetype.includes('webm') ? 'webm' :
                   req.file.mimetype.includes('wav') ? 'pcm' :
                   req.file.mimetype.includes('mp3') ? 'mp3' : 'pcm';

    // Convert to PCM if necessary (or send as is for now)
    let pcmBuffer;
    try {
      pcmBuffer = await transcribeService.convertToPCM(audioBuffer, format);
    } catch (conversionError) {
      // If conversion fails, try using raw buffer
      console.warn('Audio conversion failed, using raw buffer:', conversionError.message);
      pcmBuffer = audioBuffer;
    }

    const options = {
      languageCode,
      sampleRate: parseInt(sampleRate, 10),
      mediaEncoding: format === 'pcm' ? 'pcm' : 'pcm',
    };

    const result = await transcribeService.transcribeAudio(pcmBuffer, options);

    res.json({
      success: true,
      transcript: result.transcript,
      isPartial: result.isPartial,
      languageCode: result.languageCode,
      confidence: result.confidence,
      audioInfo: {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Transcribe endpoint error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error.message,
    });
  }
});

/**
 * POST /api/transcribe/base64
 * Transcribe base64 encoded audio
 * Body: { audio: string (base64), format?: string, languageCode?: string }
 */
router.post('/base64', async (req, res) => {
  try {
    const { audio, format = 'webm', languageCode = 'en-IN', sampleRate = '16000' } = req.body;

    if (!audio || typeof audio !== 'string') {
      return res.status(400).json({ error: 'Base64 audio data is required' });
    }

    // Decode base64
    let audioBuffer;
    try {
      audioBuffer = Buffer.from(audio, 'base64');
    } catch (e) {
      return res.status(400).json({ error: 'Invalid base64 audio data' });
    }

    console.log(`Received base64 audio: ${audioBuffer.length} bytes`);

    // Convert to PCM if necessary
    let pcmBuffer;
    try {
      pcmBuffer = await transcribeService.convertToPCM(audioBuffer, format);
    } catch (conversionError) {
      console.warn('Audio conversion failed, using raw buffer:', conversionError.message);
      pcmBuffer = audioBuffer;
    }

    const options = {
      languageCode,
      sampleRate: parseInt(sampleRate, 10),
    };

    const result = await transcribeService.transcribeAudio(pcmBuffer, options);

    res.json({
      success: true,
      transcript: result.transcript,
      isPartial: result.isPartial,
      languageCode: result.languageCode,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Transcribe base64 endpoint error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error.message,
    });
  }
});

/**
 * GET /api/transcribe/languages
 * Get list of supported languages
 */
router.get('/languages', (req, res) => {
  try {
    const languages = transcribeService.getSupportedLanguages();

    res.json({
      success: true,
      languages,
      default: languages.find(l => l.code === 'en-IN'),
    });
  } catch (error) {
    console.error('Get languages endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get languages',
      message: error.message,
    });
  }
});

/**
 * POST /api/transcribe/voice-command
 * Specialized endpoint for voice commands
 * FormData: { audio: File }
 */
router.post('/voice-command', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioBuffer = req.file.buffer;

    const options = {
      languageCode: 'en-IN',
      sampleRate: 16000,
      enablePartialResults: false,
    };

    const result = await transcribeService.transcribeAudio(audioBuffer, options);

    // Process common voice commands
    const command = result.transcript.toLowerCase().trim();
    let action = null;

    // Simple command recognition
    if (command.includes('compare') || command.includes('versus') || command.includes('vs')) {
      action = { type: 'COMPARE', text: result.transcript };
    } else if (command.includes('buy') || command.includes('purchase') || command.includes('order')) {
      action = { type: 'BUY', text: result.transcript };
    } else if (command.includes('details') || command.includes('info') || command.includes('tell me')) {
      action = { type: 'DETAILS', text: result.transcript };
    } else if (command.includes('recommend') || command.includes('suggest') || command.includes('best')) {
      action = { type: 'RECOMMEND', text: result.transcript };
    } else {
      action = { type: 'CHAT', text: result.transcript };
    }

    res.json({
      success: true,
      transcript: result.transcript,
      action,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Voice command endpoint error:', error);
    res.status(500).json({
      error: 'Failed to process voice command',
      message: error.message,
    });
  }
});

export default router;

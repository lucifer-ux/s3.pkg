import express from 'express';
import { getOCRService } from '../services/ocrService.js';

const router = express.Router();

router.post('/pan-extract', async (req, res) => {
  console.log('[API] ========== /api/ocr/pan-extract called ==========');
  console.log('[API] Request received at:', new Date().toISOString());
  
  try {
    const { image } = req.body;
    console.log('[API] Image data present:', !!image);
    console.log('[API] Image data length:', image?.length || 0);

    if (!image) {
      console.error('[API] ERROR: No image data provided');
      return res.status(400).json({
        success: false,
        error: 'Image data is required (base64 encoded)'
      });
    }

    console.log('[API] Cleaning base64 image data...');
    const base64Image = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    console.log('[API] Cleaned base64 length:', base64Image.length);
    console.log('[API] First 100 chars of cleaned base64:', base64Image.substring(0, 100));

    console.log('[API] Getting OCR service instance...');
    const ocrService = getOCRService();
    console.log('[API] Calling ocrService.extractPANDetails...');
    const result = await ocrService.extractPANDetails(base64Image);
    console.log('[API] OCR Service result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error('[API] OCR extraction failed:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error,
        data: null
      });
    }

    console.log('[API] ========== Request completed successfully ==========');
    res.json({
      success: true,
      data: result.data,
      rawText: result.rawText,
      service: result.service
    });
  } catch (error) {
    console.error('[API] ========== UNHANDLED ERROR ==========');
    console.error('[API] Error name:', error.name);
    console.error('[API] Error message:', error.message);
    console.error('[API] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      data: null
    });
  }
});

router.post('/pan-validate', async (req, res) => {
  console.log('[API] /api/ocr/pan-validate called');
  
  try {
    const { image } = req.body;
    console.log('[API] Image data present:', !!image);

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required (base64 encoded)'
      });
    }

    const base64Image = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    console.log('[API] Cleaned base64 length:', base64Image.length);

    const ocrService = getOCRService();
    const result = await ocrService.validatePANCard(base64Image);
    console.log('[API] Validation result:', result);

    res.json(result);
  } catch (error) {
    console.error('[API] Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

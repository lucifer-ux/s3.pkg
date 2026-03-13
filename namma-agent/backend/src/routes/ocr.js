import express from 'express';
import ocrService from '../services/ocrService.js';

const router = express.Router();

router.post('/pan-extract', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required (base64 encoded)'
      });
    }

    const base64Image = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const result = await ocrService.extractPANDetails(base64Image);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        data: null
      });
    }

    res.json({
      success: true,
      data: result.data,
      model: result.model,
      usage: result.usage
    });
  } catch (error) {
    console.error('PAN extraction endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: null
    });
  }
});

router.post('/pan-validate', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Image data is required (base64 encoded)'
      });
    }

    const base64Image = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const result = await ocrService.validatePANCard(base64Image);

    res.json(result);
  } catch (error) {
    console.error('PAN validation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

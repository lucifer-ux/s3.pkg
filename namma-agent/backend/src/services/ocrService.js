import axios from 'axios';
import FormData from 'form-data';

class OCRService {
  constructor() {
    console.log('[OCR] Initializing OCR Service...');
    console.log('[OCR] OCR_SPACE_API_KEY:', process.env.OCR_SPACE_API_KEY ? 'Set (hidden)' : 'NOT SET');
    
    this.apiKey = process.env.OCR_SPACE_API_KEY;
    
    if (!this.apiKey) {
      console.error('[OCR] WARNING: OCR_SPACE_API_KEY not set in environment variables');
    } else {
      console.log('[OCR] OCR Service initialized successfully with OCR.space');
    }
  }

  async extractPANDetails(base64Image) {
    console.log('[OCR] ========== PAN EXTRACTION STARTED ==========');
    console.log('[OCR] Received base64 image, length:', base64Image?.length || 0);
    
    if (!base64Image) {
      console.error('[OCR] ERROR: No image data provided');
      return { success: false, error: 'No image data provided', data: null };
    }

    if (!this.apiKey) {
      console.error('[OCR] ERROR: OCR_SPACE_API_KEY not configured');
      return { 
        success: false, 
        error: 'OCR service not configured. Please set OCR_SPACE_API_KEY in .env file',
        data: null 
      };
    }

    try {
      console.log('[OCR] Preparing OCR.space API request...');
      
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
      formData.append('apikey', this.apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      console.log('[OCR] Sending request to OCR.space API...');
      
      const response = await axios.post('https://api.ocr.space/parse/image', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });

      console.log('[OCR] OCR.space API response received');
      console.log('[OCR] Response status:', response.data?.OCRExitCode);

      if (response.data?.IsErroredOnProcessing) {
        console.error('[OCR] OCR.space API error:', response.data.ErrorMessage);
        return {
          success: false,
          error: response.data.ErrorMessage || 'OCR processing failed',
          data: null,
        };
      }

      const parsedResults = response.data?.ParsedResults;
      if (!parsedResults || parsedResults.length === 0) {
        console.error('[OCR] No text detected in image');
        return {
          success: false,
          error: 'No text detected in image',
          data: null,
        };
      }

      const fullText = parsedResults.map(r => r.ParsedText).join('\n');
      console.log('[OCR] Extracted text length:', fullText.length);
      console.log('[OCR] Raw text preview:', fullText.substring(0, 500));

      console.log('[OCR] Parsing PAN card text...');
      const extractedData = this.parsePANCardText(fullText);
      console.log('[OCR] Parsed data:', JSON.stringify(extractedData, null, 2));

      console.log('[OCR] ========== PAN EXTRACTION COMPLETED ==========');
      return {
        success: true,
        data: extractedData,
        rawText: fullText,
        service: 'ocr.space',
      };
    } catch (error) {
      console.error('[OCR] ========== PAN EXTRACTION FAILED ==========');
      console.error('[OCR] Error name:', error.name);
      console.error('[OCR] Error message:', error.message);
      if (error.response) {
        console.error('[OCR] Response status:', error.response.status);
        console.error('[OCR] Response data:', error.response.data);
      }
      return {
        success: false,
        error: error.response?.data?.ErrorMessage || error.message,
        data: null,
      };
    }
  }

  parsePANCardText(text) {
    console.log('[OCR] Starting text parsing...');
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('[OCR] Total lines after filtering:', lines.length);
    console.log('[OCR] All lines:', lines);

    const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
    const panMatch = text.match(panRegex);
    const panNumber = panMatch ? panMatch[0] : null;
    console.log('[OCR] PAN number found:', panNumber);

    const datePatterns = [
      /(\d{2})\/(\d{2})\/(\d{4})/,
      /(\d{2})-(\d{2})-(\d{4})/,
      /(\d{2})\.(\d{2})\.(\d{4})/,
    ];

    let dateOfBirth = null;
    for (const pattern of datePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch) {
        dateOfBirth = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
        console.log('[OCR] Date of birth found:', dateOfBirth);
        break;
      }
    }
    if (!dateOfBirth) {
      console.log('[OCR] No date of birth found in text');
    }

    let name = null;
    let fatherName = null;

    console.log('[OCR] Scanning lines for name and father name...');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`[OCR] Line ${i}: "${line}"`);

      if (/INCOME|TAX|DEPT|GOVT|INDIA|PERMANENT|ACCOUNT|NUMBER|Signature|Date/i.test(line)) {
        console.log(`[OCR]   -> Skipping (matched skip pattern)`);
        continue;
      }

      const fatherMatch = line.match(/(?:S\/O|D\/O|W\/O)\s*[:\-]?\s*([A-Z][A-Z\s]+)/i);
      if (fatherMatch && !fatherName) {
        fatherName = fatherMatch[1].trim();
        console.log(`[OCR]   -> Found father name: "${fatherName}"`);
        continue;
      }

      if (/^[A-Z][A-Z\s]+$/.test(line) && line.length > 5 && line.length < 50) {
        const words = line.split(/\s+/).filter(w => w.length > 1);
        console.log(`[OCR]   -> Uppercase candidate, words:`, words);
        if (words.length >= 2 && words.length <= 4) {
          if (!name && line !== fatherName) {
            name = line;
            console.log(`[OCR]   -> Set as name: "${name}"`);
          } else if (!fatherName && name && line !== name) {
            fatherName = line;
            console.log(`[OCR]   -> Set as father name: "${fatherName}"`);
          }
        }
      }
    }

    let confidence = 'low';
    const hasPan = !!panNumber;
    const hasName = !!name;
    const hasDob = !!dateOfBirth;

    console.log('[OCR] Data completeness check:');
    console.log('  - Has PAN:', hasPan);
    console.log('  - Has Name:', hasName);
    console.log('  - Has DOB:', hasDob);

    if (hasPan && hasName && hasDob) {
      confidence = 'high';
    } else if ((hasPan && hasName) || (hasPan && hasDob)) {
      confidence = 'medium';
    }
    console.log('[OCR] Confidence level:', confidence);

    return { panNumber, name, fatherName, dateOfBirth, confidence };
  }

  async extractTextFromImage(base64Image, documentType = 'generic') {
    console.log(`[OCR] Generic text extraction started for type: ${documentType}`);
    
    if (!this.apiKey) {
      return {
        success: false,
        error: 'OCR_SPACE_API_KEY not configured',
        text: null,
      };
    }
    
    try {
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
      formData.append('apikey', this.apiKey);
      formData.append('language', 'eng');

      console.log('[OCR] Sending to OCR.space API...');
      const response = await axios.post('https://api.ocr.space/parse/image', formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });

      const text = response.data?.ParsedResults?.[0]?.ParsedText || '';
      console.log('[OCR] Extracted text length:', text.length);

      if (documentType === 'pan') {
        console.log('[OCR] Parsing as PAN document...');
        const parsedData = this.parsePANCardText(text);
        return {
          success: true,
          text,
          parsedData,
          documentType,
          service: 'ocr.space',
        };
      }

      return {
        success: true,
        text,
        documentType,
        service: 'ocr.space',
      };
    } catch (error) {
      console.error('[OCR] Text extraction failed:', error.message);
      return {
        success: false,
        error: error.message,
        text: null,
      };
    }
  }

  async validatePANCard(base64Image) {
    console.log('[OCR] PAN validation started');
    
    try {
      const result = await this.extractPANDetails(base64Image);

      if (!result.success) {
        console.log('[OCR] Validation failed - extraction unsuccessful');
        return {
          success: true,
          isValid: false,
          reason: result.error || 'Failed to extract text',
          panNumber: null,
        };
      }

      const { panNumber, name, dateOfBirth, confidence } = result.data;
      
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const isValidFormat = panRegex.test(panNumber || '');
      
      const isValid = isValidFormat && confidence !== 'low';
      
      console.log('[OCR] Validation result:');
      console.log('  - isValidFormat:', isValidFormat);
      console.log('  - confidence:', confidence);
      console.log('  - Final isValid:', isValid);

      return {
        success: true,
        isValid,
        reason: isValid 
          ? 'Valid PAN card detected' 
          : !isValidFormat 
            ? 'Invalid PAN number format'
            : 'Low confidence in extracted data',
        panNumber,
        name,
        dateOfBirth,
        confidence,
      };
    } catch (error) {
      console.error('[OCR] Validation error:', error.message);
      return {
        success: false,
        isValid: false,
        error: error.message,
      };
    }
  }
}

let instance = null;

export function getOCRService() {
  if (!instance) {
    instance = new OCRService();
  }
  return instance;
}

export default { getOCRService };

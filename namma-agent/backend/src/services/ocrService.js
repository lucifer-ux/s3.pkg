import OpenAI from 'openai';

class OCRService {
  constructor() {
    let apiUrl = process.env.LITELLM_API_URL || 'http://localhost:4000';
    apiUrl = apiUrl.replace(/\/$/, '');
    if (!apiUrl.endsWith('/v1')) {
      apiUrl = apiUrl + '/v1';
    }
    
    this.client = new OpenAI({
      apiKey: process.env.LITELLM_API_KEY || 'sk-test',
      baseURL: apiUrl,
    });

    this.defaultModel = process.env.LITELLM_VISION_MODEL || process.env.LITELLM_MODEL || 'gpt-4o-mini';
    console.log('OCR Service initialized with model:', this.defaultModel);
    console.log('API URL:', apiUrl);
  }

  /**
   * Extract PAN card details from image using LLM vision
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<Object>} - Extracted PAN details
   */
  async extractPANDetails(base64Image) {
    try {
      const systemPrompt = `You are an OCR extraction specialist. Extract information from Indian PAN (Permanent Account Number) card images.

Extract these fields:
- panNumber: The 10-character alphanumeric PAN number (format: ABCDE1234F)
- name: Full name as shown on the card
- fatherName: Father's name (if visible)
- dateOfBirth: Date of birth in DD/MM/YYYY format

Respond ONLY in valid JSON format like this:
{
  "panNumber": "ABCDE1234F",
  "name": "RAHUL SHARMA",
  "fatherName": "SURESH SHARMA",
  "dateOfBirth": "15/08/1996",
  "confidence": "high"
}

If any field is not visible or unclear, set it to null.
Confidence can be "high", "medium", or "low".

Be strict about the PAN number format - it must be 10 characters: 5 letters, 4 numbers, 1 letter.`;

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all visible information from this PAN card image. Return only valid JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      
      let parsedData;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(content);
        }
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Content:', content);
        return {
          success: false,
          error: 'Failed to parse LLM response',
          data: null,
          rawContent: content
        };
      }

      return {
        success: true,
        data: {
          panNumber: parsedData.panNumber || null,
          name: parsedData.name || null,
          fatherName: parsedData.fatherName || null,
          dateOfBirth: parsedData.dateOfBirth || null,
          confidence: parsedData.confidence || 'low'
        },
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      console.error('PAN OCR error:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Extract text from any document image
   * @param {string} base64Image - Base64 encoded image
   * @param {string} documentType - Type of document (pan, aadhaar, etc.)
   * @returns {Promise<Object>} - Extracted text
   */
  async extractTextFromImage(base64Image, documentType = 'generic') {
    try {
      const prompts = {
        pan: 'Extract all text from this PAN card image. Return structured JSON with extracted fields.',
        aadhaar: 'Extract all text from this Aadhaar card image. Return structured JSON with extracted fields.',
        generic: 'Extract all visible text from this image. Return as plain text.'
      };

      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompts[documentType] || prompts.generic
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      return {
        success: true,
        text: response.choices[0].message.content,
        model: response.model,
        usage: response.usage
      };
    } catch (error) {
      console.error('OCR extraction error:', error);
      return {
        success: false,
        error: error.message,
        text: null
      };
    }
  }

  /**
   * Validate if image contains a valid PAN card
   * @param {string} base64Image - Base64 encoded image
   * @returns {Promise<Object>} - Validation result
   */
  async validatePANCard(base64Image) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are a document validator. Check if the image is a valid Indian PAN card. Respond with JSON: { "isValid": boolean, "reason": string, "panNumber": string|null }'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Is this a valid Indian PAN card? Check for PAN number format (ABCDE1234F), name field, and photo. Return JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);

      return {
        success: true,
        isValid: result.isValid || false,
        reason: result.reason || '',
        panNumber: result.panNumber || null
      };
    } catch (error) {
      console.error('PAN validation error:', error);
      return {
        success: false,
        isValid: false,
        error: error.message
      };
    }
  }
}

export default new OCRService();

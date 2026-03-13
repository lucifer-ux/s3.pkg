import { PollyClient, SynthesizeSpeechCommand, DescribeVoicesCommand } from '@aws-sdk/client-polly';
import { getSignedUrl } from '@aws-sdk/polly-request-presigner';

class PollyService {
  constructor() {
    this.client = new PollyClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Default voice settings optimized for Indian English
    this.defaultVoice = process.env.POLLY_VOICE || 'Kajal';
    this.defaultEngine = process.env.POLLY_ENGINE || 'neural';
    this.defaultLanguage = process.env.POLLY_LANGUAGE || 'en-IN';
  }

  /**
   * Synthesize text to speech using AWS Polly
   * @param {string} text - The text to synthesize
   * @param {Object} options - Voice options
   * @returns {Promise<Buffer>} - Audio stream buffer
   */
  async synthesizeSpeech(text, options = {}) {
    try {
      const {
        voiceId = this.defaultVoice,
        engine = this.defaultEngine,
        languageCode = this.defaultLanguage,
        outputFormat = 'mp3',
        sampleRate = '24000'
      } = options;

      // Check text length (Polly has a limit of 3000 characters for neural voices)
      if (text.length > 3000) {
        throw new Error('Text exceeds maximum length of 3000 characters');
      }

      const params = {
        Text: text,
        OutputFormat: outputFormat,
        VoiceId: voiceId,
        Engine: engine,
        LanguageCode: languageCode,
        SampleRate: sampleRate,
      };

      console.log(`Synthesizing speech with voice: ${voiceId}, engine: ${engine}`);

      const command = new SynthesizeSpeechCommand(params);
      const response = await this.client.send(command);

      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of response.AudioStream) {
        chunks.push(chunk);
      }
      const audioBuffer = Buffer.concat(chunks);

      return {
        audioBuffer,
        contentType: `audio/${outputFormat}`,
        requestCharacters: text.length,
      };
    } catch (error) {
      console.error('Polly synthesis error:', error);
      throw new Error(`Failed to synthesize speech: ${error.message}`);
    }
  }

  /**
   * Get available voices from AWS Polly
   * @param {string} languageCode - Filter by language code
   * @returns {Promise<Array>} - List of available voices
   */
  async getVoices(languageCode = null) {
    try {
      const params = {};
      if (languageCode) {
        params.LanguageCode = languageCode;
      }

      const command = new DescribeVoicesCommand(params);
      const response = await this.client.send(command);

      return response.Voices.map(voice => ({
        id: voice.Id,
        name: voice.Name,
        gender: voice.Gender,
        languageCode: voice.LanguageCode,
        languageName: voice.LanguageName,
        engine: voice.SupportedEngines,
      }));
    } catch (error) {
      console.error('Polly get voices error:', error);
      throw new Error(`Failed to get voices: ${error.message}`);
    }
  }

  /**
   * Get recommended voices for Indian English
   * @returns {Array} - List of recommended voices
   */
  getRecommendedVoices() {
    return [
      {
        id: 'Kajal',
        name: 'Kajal',
        description: 'Female - Indian English (Neural)',
        languageCode: 'en-IN',
        engine: 'neural',
        recommended: true,
      },
      {
        id: 'Raveena',
        name: 'Raveena',
        description: 'Female - Indian English (Standard)',
        languageCode: 'en-IN',
        engine: 'standard',
        recommended: false,
      },
      {
        id: 'Aditi',
        name: 'Aditi',
        description: 'Female - Hindi & Indian English (Standard)',
        languageCode: 'hi-IN',
        engine: 'standard',
        recommended: false,
      },
      {
        id: 'Joanna',
        name: 'Joanna',
        description: 'Female - US English (Neural)',
        languageCode: 'en-US',
        engine: 'neural',
        recommended: false,
      },
      {
        id: 'Matthew',
        name: 'Matthew',
        description: 'Male - US English (Neural)',
        languageCode: 'en-US',
        engine: 'neural',
        recommended: false,
      },
    ];
  }

  /**
   * Get SSML-enhanced text for better speech quality
   * @param {string} text - Plain text
   * @returns {string} - SSML formatted text
   */
  enhanceWithSSML(text) {
    // Add basic SSML enhancements for better speech quality
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    return `<speak>
      <prosody rate="medium" pitch="medium">
        ${escapedText}
      </prosody>
    </speak>`;
  }
}

export default new PollyService();

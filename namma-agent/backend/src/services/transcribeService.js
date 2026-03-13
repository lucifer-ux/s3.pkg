import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from '@aws-sdk/client-transcribe-streaming';
import { Readable } from 'stream';

class TranscribeService {
  constructor() {
    this.client = new TranscribeStreamingClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    // Default transcription settings optimized for Indian English
    this.defaultLanguage = process.env.TRANSCRIBE_LANGUAGE || 'en-IN';
    this.defaultSampleRate = 16000;
  }

  /**
   * Create an async generator for audio chunks
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {number} chunkSize - Size of each chunk in bytes
   */
  async *getAudioStream(audioBuffer, chunkSize = 8192) {
    let offset = 0;
    while (offset < audioBuffer.length) {
      const chunk = audioBuffer.slice(offset, offset + chunkSize);
      yield { AudioEvent: { AudioChunk: chunk } };
      offset += chunkSize;
    }
  }

  /**
   * Transcribe audio using AWS Transcribe Streaming
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeAudio(audioBuffer, options = {}) {
    try {
      const {
        languageCode = this.defaultLanguage,
        sampleRate = this.defaultSampleRate,
        mediaEncoding = 'pcm',
        numberOfChannels = 1,
        enablePartialResults = true,
        vocabularyName = null,
        sessionId = null,
      } = options;

      console.log(`Starting transcription for ${audioBuffer.length} bytes, language: ${languageCode}`);

      const params = {
        LanguageCode: languageCode,
        MediaSampleRateHertz: sampleRate,
        MediaEncoding: mediaEncoding,
        NumberOfChannels: numberOfChannels,
        EnablePartialResultsStability: enablePartialResults,
        AudioStream: this.getAudioStream(audioBuffer),
      };

      if (vocabularyName) {
        params.VocabularyName = vocabularyName;
      }

      if (sessionId) {
        params.SessionId = sessionId;
      }

      const command = new StartStreamTranscriptionCommand(params);
      const response = await this.client.send(command);

      // Collect transcription results
      const transcripts = [];
      const partialTranscripts = [];
      let isPartial = true;

      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript.Results;

          for (const result of results) {
            if (result.Alternatives && result.Alternatives.length > 0) {
              const transcript = result.Alternatives[0].Transcript;

              if (result.IsPartial) {
                partialTranscripts.push(transcript);
              } else {
                transcripts.push(transcript);
                isPartial = false;
              }
            }
          }
        }
      }

      const finalTranscript = transcripts.join(' ');

      return {
        transcript: finalTranscript,
        isPartial,
        partialTranscripts,
        languageCode,
        confidence: this.calculateConfidence(transcripts),
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Transcribe with real-time streaming (for WebSocket)
   * @param {AsyncGenerator} audioStream - Async generator of audio chunks
   * @param {Object} options - Transcription options
   */
  async *transcribeStream(audioStream, options = {}) {
    try {
      const {
        languageCode = this.defaultLanguage,
        sampleRate = this.defaultSampleRate,
        mediaEncoding = 'pcm',
      } = options;

      const params = {
        LanguageCode: languageCode,
        MediaSampleRateHertz: sampleRate,
        MediaEncoding: mediaEncoding,
        AudioStream: audioStream,
      };

      const command = new StartStreamTranscriptionCommand(params);
      const response = await this.client.send(command);

      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript.Results;

          for (const result of results) {
            if (result.Alternatives && result.Alternatives.length > 0) {
              yield {
                transcript: result.Alternatives[0].Transcript,
                isPartial: result.IsPartial,
                items: result.Alternatives[0].Items,
              };
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming transcription error:', error);
      throw error;
    }
  }

  /**
   * Convert audio format to PCM 16kHz mono (required by Transcribe)
   * This is a placeholder - actual conversion would require ffmpeg or similar
   * @param {Buffer} audioBuffer - Input audio buffer
   * @param {string} inputFormat - Input format (mp3, wav, etc.)
   */
  async convertToPCM(audioBuffer, inputFormat = 'webm') {
    // For now, assume the audio is already in the correct format
    // In production, you'd use ffmpeg to convert from webm/mp3 to pcm
    // ffmpeg -i input.webm -ar 16000 -ac 1 -f s16le output.pcm

    // If the input is already PCM, return as is
    if (inputFormat === 'pcm' || inputFormat === 'raw') {
      return audioBuffer;
    }

    // For WebM/Opus from browser MediaRecorder, we need to decode
    // This would typically involve a library like @ffmpeg/ffmpeg
    // For now, throw an error indicating conversion is needed
    throw new Error(
      `Audio format ${inputFormat} needs conversion to PCM. ` +
      'Please send PCM 16kHz mono audio or implement format conversion.'
    );
  }

  /**
   * Calculate confidence score based on transcript results
   * @param {Array} transcripts - Array of transcript segments
   */
  calculateConfidence(transcripts) {
    // Simplified confidence calculation
    // In production, you'd use the actual confidence scores from AWS
    if (transcripts.length === 0) return 0;
    return Math.min(1, 0.7 + (transcripts.length * 0.05));
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return [
      { code: 'en-IN', name: 'Indian English', flag: '🇮🇳' },
      { code: 'en-US', name: 'US English', flag: '🇺🇸' },
      { code: 'en-GB', name: 'British English', flag: '🇬🇧' },
      { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
      { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳' },
      { code: 'te-IN', name: 'Telugu', flag: '🇮🇳' },
      { code: 'mr-IN', name: 'Marathi', flag: '🇮🇳' },
      { code: 'bn-IN', name: 'Bengali', flag: '🇮🇳' },
      { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳' },
      { code: 'ml-IN', name: 'Malayalam', flag: '🇮🇳' },
      { code: 'gu-IN', name: 'Gujarati', flag: '🇮🇳' },
      { code: 'pa-IN', name: 'Punjabi', flag: '🇮🇳' },
    ];
  }

  /**
   * Create a vocabulary filter for profanity/custom words
   * This would be used to filter out certain words
   */
  async createVocabularyFilter(words, vocabularyName) {
    // Implementation for creating vocabulary filter
    // This would use CreateVocabularyFilterCommand
    console.log(`Creating vocabulary filter: ${vocabularyName} with ${words.length} words`);
    // Placeholder implementation
    return { vocabularyName, words: words.length };
  }
}

export default new TranscribeService();

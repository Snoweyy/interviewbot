import speech from '@google-cloud/speech'
import textToSpeech from '@google-cloud/text-to-speech'

const speechClient = new speech.SpeechClient()
const ttsClient = new textToSpeech.TextToSpeechClient()

export interface SpeechRecognitionResult {
  transcript: string
  confidence: number
  alternatives: Array<{
    transcript: string
    confidence: number
  }>
}

export interface TextToSpeechResult {
  audioContent: Buffer
  audioEncoding: string
  sampleRate: number
}

export async function recognizeSpeech(
  audioBuffer: Buffer,
  sampleRate: number = 16000,
  languageCode: string = 'en-US',
  encoding: 'LINEAR16' | 'WEBM_OPUS' = 'WEBM_OPUS'
): Promise<SpeechRecognitionResult> {
  try {
    const request = {
      audio: {
        content: audioBuffer.toString('base64'),
      },
      config: {
        encoding,
        sampleRateHertz: encoding === 'LINEAR16' ? sampleRate : undefined,
        languageCode,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: 'latest_long',
        useEnhanced: true,
      },
    }

    const [response] = await speechClient.recognize(request)
    
    if (!response.results || response.results.length === 0) {
      throw new Error('No speech recognized')
    }

    const result = response.results[0]
    const alternatives = result.alternatives || []
    
    if (alternatives.length === 0) {
      throw new Error('No alternatives found')
    }

    const bestAlternative = alternatives[0]
    
    return {
      transcript: bestAlternative.transcript || '',
      confidence: bestAlternative.confidence || 0,
      alternatives: alternatives.map(alt => ({
        transcript: alt.transcript || '',
        confidence: alt.confidence || 0,
      })),
    }
  } catch (error) {
    console.error('Speech recognition error:', error)
    throw new Error('Failed to recognize speech')
  }
}

export async function synthesizeSpeech(
  text: string,
  voiceName: string = 'en-US-Neural2-D',
  speakingRate: number = 1.0,
  pitch: number = 0.0
): Promise<TextToSpeechResult> {
  try {
    const request = {
      input: { text },
      voice: {
        languageCode: 'en-US',
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
        speakingRate,
        pitch,
        effectsProfileId: ['handset-class-device'],
      },
    }

    const [response] = await ttsClient.synthesizeSpeech(request)
    
    if (!response.audioContent) {
      throw new Error('No audio content generated')
    }

    return {
      audioContent: Buffer.from(response.audioContent as string, 'base64'),
      audioEncoding: 'MP3',
      sampleRate: 24000,
    }
  } catch (error) {
    console.error('Text-to-speech error:', error)
    throw new Error('Failed to synthesize speech')
  }
}

export function createAudioBuffer(audioContent: Buffer): ArrayBuffer {
  return audioContent.buffer.slice(
    audioContent.byteOffset,
    audioContent.byteOffset + audioContent.byteLength
  )
}

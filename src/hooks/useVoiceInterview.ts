import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const API_BASE = '/api'
const TURN_WINDOW_MS = 6000
const CAPTION_MIN_BYTES = 3000
const RECORD_TIMESLICE_MS = 1500
const MIN_TURN_MS = 4000
const MIN_SEND_BYTES = 25000

export interface InterviewConfig {
  field: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  questionCount: number
  timeLimit: number
}

export interface ConversationTurn {
  speaker: 'user' | 'ai'
  text: string
}

export interface VoiceInterviewState {
  sessionId: string | null
  isConnected: boolean
  isListening: boolean
  isProcessing: boolean
  isSpeaking: boolean
  transcript: string
  aiResponse: string
  conversationHistory: ConversationTurn[]
  error: string | null
  audioUnlockRequired?: boolean
  // New interview state
  questionNumber: number
  totalQuestions: number
  phase: 'greeting' | 'questions' | 'ending'
  timeRemaining: number
  shouldEnd: boolean
  config: InterviewConfig | null
  // Video state
  videoStream: MediaStream | null
  isVideoEnabled: boolean
}

export function useVoiceInterview() {
  const [state, setState] = useState<VoiceInterviewState>({
    sessionId: null,
    isConnected: false,
    isListening: false,
    isProcessing: false,
    isSpeaking: false,
    transcript: '',
    aiResponse: '',
    conversationHistory: [],
    error: null,
    audioUnlockRequired: false,
    questionNumber: 0,
    totalQuestions: 5,
    phase: 'greeting',
    timeRemaining: 600,
    shouldEnd: false,
    config: null,
    videoStream: null,
    isVideoEnabled: true
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const pendingAudioRef = useRef<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)
  const visibilityRef = useRef<boolean>(true)
  const turnTimerRef = useRef<number | null>(null)
  const interviewTypeRef = useRef<string>('technical')
  const autoRestartRef = useRef<boolean>(true)
  const startTimeRef = useRef<number>(Date.now())
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCaptionSentRef = useRef<number>(0)
  const turnStartRef = useRef<number>(0)

  // VAD refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasSpokenRef = useRef<boolean>(false)

  // Initialize audio player
  useEffect(() => {
    audioPlayerRef.current = new Audio()
    audioPlayerRef.current.onended = () => {
      setState(prev => ({ ...prev, isSpeaking: false }))
      // Auto-restart listening after AI finishes speaking (unless ending)
      if (autoRestartRef.current && state.isConnected && state.phase !== 'ending') {
        setTimeout(() => startListening(), 500)
      }
    }
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [state.isConnected, state.phase])

  // Timer countdown
  useEffect(() => {
    if (state.isConnected && state.config) {
      const timeLimitMs = state.config.timeLimit * 60 * 1000
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const remaining = Math.max(0, Math.floor((timeLimitMs - elapsed) / 1000))
        setState(prev => ({ ...prev, timeRemaining: remaining }))
      }, 1000)

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
        }
      }
    }
  }, [state.isConnected, state.config])

  const startInterview = async (config: InterviewConfig) => {
    try {
      interviewTypeRef.current = 'technical'
      startTimeRef.current = Date.now()

      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        streamRef.current = stream
        const [track] = stream.getAudioTracks()
        if (track) {
          track.onended = async () => { try { if (state.isConnected) await reinitializeStream() } catch (err) { console.error('Audio track ended, reinit failed:', err) } }
          track.onmute = async () => { try { if (state.isConnected) await reinitializeStream() } catch (err) { console.error('Audio track muted, reinit failed:', err) } }
        }
      } catch (e: any) {
        setState(prev => ({ ...prev, error: 'Microphone permission denied. In Brave: lock icon → Site settings → Microphone: Allow, then click Request Mic.' }))
      }

      // Initialize video stream
      let videoStream: MediaStream | null = null
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })
        videoStreamRef.current = videoStream
        setState(prev => ({ ...prev, videoStream: videoStream, isVideoEnabled: true }))
      } catch (e: any) {
        console.warn('Camera permission denied or not available:', e)
        setState(prev => ({ ...prev, isVideoEnabled: false }))
      }

      // Get current user or create guest session
      const { data: { user } } = await supabase.auth.getUser()

      // Call backend to start interview with new config
      const response = await fetch(`${API_BASE}/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          interviewType: 'technical',
          field: config.field,
          techStack: [config.field],
          difficulty: config.difficulty,
          questionCount: config.questionCount,
          timeLimit: config.timeLimit
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start interview')
      }

      const data = await response.json()

      if (stream) {
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
        const mediaRecorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 })
        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
            // Live caption throttle ~300ms
            const now = performance.now()
            if (now - lastCaptionSentRef.current > 300) {
              lastCaptionSentRef.current = now
              try {
                if (event.data.size < CAPTION_MIN_BYTES) {
                  return
                }
                const base64 = await blobToBase64(event.data)
                const res = await fetch(`${API_BASE}/interview/caption`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioData: base64, sessionId: data.sessionId })
                })
                const j = await res.json()
                if (j?.transcript) {
                  setState(prev => ({ ...prev, transcript: j.transcript }))
                }
              } catch { }
            }
          }
        }
        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length) {
            const firstType = (audioChunksRef.current[0] as any)?.type || 'audio/webm'
            const audioBlob = new Blob(audioChunksRef.current, { type: firstType })
            audioChunksRef.current = []
            console.log('final blob bytes', audioBlob.size, firstType)
            if (audioBlob.size < MIN_SEND_BYTES) {
              setState(prev => ({ ...prev, isListening: false }))
              setTimeout(() => startListening(), 300)
              return
            }
            await processVoiceStreaming(audioBlob, data.sessionId)
          }
        }
        mediaRecorderRef.current = mediaRecorder
      }

      setState(prev => ({
        ...prev,
        sessionId: data.sessionId,
        isConnected: true,
        aiResponse: data.initialGreeting,
        conversationHistory: [{ speaker: 'ai', text: data.initialGreeting }],
        questionNumber: 0,
        totalQuestions: config.questionCount,
        phase: 'greeting',
        timeRemaining: config.timeLimit * 60,
        config: config
      }))

      // Play initial greeting audio
      if (data.initialAudioData) {
        playAudio(data.initialAudioData)
      } else {
        speakTextFallback(data.initialGreeting)
      }

      return data
    } catch (error: any) {
      console.error('Error starting interview:', error)

      let errorMessage = 'Failed to start interview'
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone access denied. Please enable microphone permissions in your browser settings.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please ensure a microphone is connected.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Microphone is busy or not readable. Please check if another app is using it.'
      }

      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }

  const processVoice = async (audioBlob: Blob, sessionId: string) => {
    setState(prev => ({ ...prev, isProcessing: true }))

    try {
      // Convert blob to base64 efficiently
      const base64Audio = await blobToBase64(audioBlob)

      // Send to backend for full voice-to-voice processing
      const response = await fetch(`${API_BASE}/interview/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          sessionId: sessionId,
          interviewType: interviewTypeRef.current
        })
      })

      if (!response.ok) {
        throw new Error('Voice processing failed')
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        isProcessing: false,
        transcript: data.userTranscript,
        aiResponse: data.aiResponse,
        conversationHistory: data.conversationHistory,
        questionNumber: data.questionNumber,
        phase: data.phase,
        shouldEnd: data.shouldEnd,
        timeRemaining: data.timeRemaining ?? prev.timeRemaining
      }))

      // Play AI response audio
      if (data.audioData) {
        playAudio(data.audioData)
      } else if (data.aiResponse) {
        speakTextFallback(data.aiResponse)
      }

      // Check if interview should end
      if (data.shouldEnd) {
        autoRestartRef.current = false
      }
    } catch (error) {
      console.error('Error processing voice:', error)
      setState(prev => ({
        ...prev,
        isProcessing: false,
        transcript: '(processing failed)'
      }))
      // Auto-restart on error if enabled
      if (autoRestartRef.current) {
        setTimeout(() => startListening(), 1000)
      }
    }
  }

  const processVoiceStreaming = async (audioBlob: Blob, sessionId: string) => {
    setState(prev => ({ ...prev, isProcessing: true, aiResponse: '' }))
    let userTranscriptReceived = ''
    try {
      const base64Audio = await blobToBase64(audioBlob)
      const res = await fetch(`${API_BASE}/interview/voice_stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: base64Audio, sessionId, interviewType: interviewTypeRef.current })
      })
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')
      let finalMeta: any = null
      let accumulatedAiText = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunkText = new TextDecoder().decode(value)
        const lines = chunkText.split('\n').filter(Boolean)
        for (const line of lines) {
          let obj: any
          try { obj = JSON.parse(line) } catch { continue }
          if (obj.type === 'text' && obj.text) {
            accumulatedAiText += obj.text
            setState(prev => ({ ...prev, aiResponse: prev.aiResponse + obj.text }))
          } else if (obj.type === 'final') {
            finalMeta = obj
            // Use the full AI response from the final payload
            const finalAiResponse = obj.aiResponse || accumulatedAiText
            const userTranscript = obj.userTranscript || ''

            setState(prev => {
              // Build new conversation history with user message first, then AI response
              const newHistory = [...prev.conversationHistory]
              if (userTranscript) {
                newHistory.push({ speaker: 'user', text: userTranscript })
              }
              newHistory.push({ speaker: 'ai', text: finalAiResponse })

              return {
                ...prev,
                isProcessing: false,
                transcript: userTranscript,
                aiResponse: finalAiResponse,
                conversationHistory: newHistory,
                questionNumber: (typeof obj.questionNumber === 'number' && obj.questionNumber > 0)
                  ? obj.questionNumber
                  : Math.min(prev.questionNumber + 1, prev.totalQuestions),
                phase: obj.phase,
                shouldEnd: obj.shouldEnd,
                timeRemaining: obj.timeRemaining
              }
            })

            if (obj.audioData) {
              await playAudio(obj.audioData)
            } else if (finalAiResponse) {
              speakTextFallback(finalAiResponse)
            }
          }
        }
      }
      // Ensure we clear processing state even if final chunk wasn't received
      if (!finalMeta) {
        setState(prev => ({ ...prev, isProcessing: false }))
        // Fallback speak if we accumulated AI text but no final payload
        const finalText = accumulatedAiText || state.aiResponse
        if (finalText && finalText.length > 0) {
          speakTextFallback(finalText)
        }
      }
    } catch (e) {
      console.error('Voice streaming error:', e)
      setState(prev => ({ ...prev, isProcessing: false }))
      // Auto-restart on error if enabled
      if (autoRestartRef.current && state.phase !== 'ending') {
        setTimeout(() => startListening(), 1000)
      }
    }
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        resolve(result.split(',')[1] || '')
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const reinitializeStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      streamRef.current = stream
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data)
        }
        mediaRecorderRef.current.onstop = async () => {
          if (audioChunksRef.current.length && state.sessionId) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            audioChunksRef.current = []
            await processVoice(audioBlob, state.sessionId)
          }
        }
      }
    } catch (err) {
      console.error('Reinitialize stream failed:', err)
    }
  }

  const playAudio = async (base64Audio: string) => {
    if (!audioPlayerRef.current || !base64Audio) return

    try {
      // Stop any currently playing audio
      audioPlayerRef.current.pause()
      audioPlayerRef.current.currentTime = 0

      // Ensure mic is closed while AI is speaking
      try {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
          setState(prev => ({ ...prev, isListening: false }))
        }
      } catch { }

      setState(prev => ({ ...prev, isSpeaking: true }))

      const audioBlob = new Blob(
        [Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      )
      const audioUrl = URL.createObjectURL(audioBlob)
      audioPlayerRef.current.src = audioUrl

      try {
        await audioPlayerRef.current.play()
      } catch (err: any) {
        if (err && (err.name === 'NotAllowedError' || err.message?.toLowerCase().includes('gesture') || err.message?.toLowerCase().includes('autoplay'))) {
          pendingAudioRef.current = base64Audio
          setState(prev => ({ ...prev, audioUnlockRequired: true, isSpeaking: false }))
          return
        }
        if (err.name !== 'AbortError') {
          setState(prev => ({ ...prev, isSpeaking: false }))
          // Fallback to browser speech synthesis when media playback fails
          speakTextFallback(state.aiResponse)
        }
      }
    } catch (error) {
      console.error('Error setting up audio:', error)
      setState(prev => ({ ...prev, isSpeaking: false }))
      // Fallback to browser speech synthesis on error
      speakTextFallback(state.aiResponse)
    }
  }

  const enableAudioPlayback = async () => {
    if (!audioPlayerRef.current || !pendingAudioRef.current) return
    const audioBlob = new Blob(
      [Uint8Array.from(atob(pendingAudioRef.current), c => c.charCodeAt(0))],
      { type: 'audio/mpeg' }
    )
    const audioUrl = URL.createObjectURL(audioBlob)
    audioPlayerRef.current.src = audioUrl
    try {
      setState(prev => ({ ...prev, audioUnlockRequired: false, isSpeaking: true }))
      await audioPlayerRef.current.play()
      pendingAudioRef.current = null
    } catch {
      setState(prev => ({ ...prev, audioUnlockRequired: true, isSpeaking: false }))
    }
  }

  const speakTextFallback = (text?: string) => {
    try {
      if (!text) return
      const synth = window.speechSynthesis
      if (!synth) return
      // Stop recording while speaking
      try {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
          setState(prev => ({ ...prev, isListening: false }))
        }
      } catch { }
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 1.0
      utter.pitch = 1.0
      utter.onend = () => {
        setState(prev => ({ ...prev, isSpeaking: false }))
        if (autoRestartRef.current && state.isConnected && state.phase !== 'ending') {
          setTimeout(() => startListening(), 500)
        }
      }
      setState(prev => ({ ...prev, isSpeaking: true }))
      synth.speak(utter)
    } catch (e) {
      console.warn('Speech synthesis fallback failed:', e)
    }
  }

  const startListening = useCallback(() => {
    if (!mediaRecorderRef.current || state.isProcessing || state.isSpeaking) return
    if (mediaRecorderRef.current.state === 'recording') return

    try {
      // Initialize AudioContext for VAD if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const stream = streamRef.current
      if (stream && audioContextRef.current) {
        // Close existing context to prevent leaks if re-initializing
        if (audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }

        const source = audioContextRef.current.createMediaStreamSource(stream)
        const analyser = audioContextRef.current.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyserRef.current = analyser

        hasSpokenRef.current = false
        monitorSilence()
      }

      if (mediaRecorderRef.current.state === 'inactive') {
        audioChunksRef.current = []
        turnStartRef.current = performance.now()
        mediaRecorderRef.current.start(RECORD_TIMESLICE_MS)
        setState(prev => ({ ...prev, isListening: true, error: null }))
      }
    } catch (error: any) {
      console.error('Error starting recording:', error)
      setState(prev => ({ ...prev, error: 'Failed to start microphone' }))
    }
  }, [state.isProcessing, state.isSpeaking])

  const monitorSilence = () => {
    if (!analyserRef.current || !state.isConnected) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

    const checkVolume = () => {
      if (!analyserRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return

      analyserRef.current.getByteFrequencyData(dataArray)

      // Calculate average volume
      let sum = 0
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i]
      }
      const average = sum / dataArray.length

      // Thresholds - adjust these if needed
      const SPEECH_THRESHOLD = 15
      const SILENCE_DURATION = 2000

      if (average > SPEECH_THRESHOLD) {
        hasSpokenRef.current = true
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      } else if (hasSpokenRef.current) {
        // Only start silence timer if user has actually spoken
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            console.log('Silence detected, stopping recording...')
            const elapsed = performance.now() - turnStartRef.current
            if (elapsed >= MIN_TURN_MS) {
              stopListening()
            }
          }, SILENCE_DURATION)
        }
      }

      requestAnimationFrame(checkVolume)
    }

    checkVolume()
  }

  const stopListening = useCallback(() => {
    if (!mediaRecorderRef.current) return

    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    try {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
        setState(prev => ({ ...prev, isListening: false }))
      }
      if (turnTimerRef.current) {
        clearTimeout(turnTimerRef.current)
        turnTimerRef.current = null
      }
    } catch (error) {
      console.error('Error stopping recording:', error)
    }
  }, [])

  const setAutoRestart = (enabled: boolean) => {
    autoRestartRef.current = enabled
  }

  const requestMicAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data) }
      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length && state.sessionId) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          audioChunksRef.current = []
          await processVoice(audioBlob, state.sessionId)
        }
      }
      mediaRecorderRef.current = mediaRecorder
      setState(prev => ({ ...prev, error: null }))
    } catch (err) {
      setState(prev => ({ ...prev, error: 'Microphone blocked. Allow mic in Brave site settings and try again.' }))
    }
  }

  const getEvaluation = async () => {
    if (!state.sessionId) return null

    try {
      const response = await fetch(`${API_BASE}/interview/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: state.sessionId })
      })

      if (!response.ok) {
        throw new Error('Evaluation failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting evaluation:', error)
      return null
    }
  }

  const stopInterview = async () => {
    try {
      autoRestartRef.current = false
      if (turnTimerRef.current) {
        clearTimeout(turnTimerRef.current)
        turnTimerRef.current = null
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }

      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }

      // Stop audio
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
      }

      // Stop microphone stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Stop video stream
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop())
        videoStreamRef.current = null
      }

      // Notify backend
      if (state.sessionId) {
        await fetch(`${API_BASE}/interview/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: state.sessionId })
        })
      }

      setState({
        sessionId: null,
        isConnected: false,
        isListening: false,
        isProcessing: false,
        isSpeaking: false,
        transcript: '',
        aiResponse: '',
        conversationHistory: [],
        error: null,
        questionNumber: 0,
        totalQuestions: 5,
        phase: 'greeting',
        timeRemaining: 600,
        shouldEnd: false,
        config: null,
        videoStream: null,
        isVideoEnabled: false
      })
    } catch (error) {
      console.error('Error stopping interview:', error)
    }
  }

  useEffect(() => {
    const onVisibility = () => {
      visibilityRef.current = !document.hidden
      // Pause chunking when hidden to avoid Brave auto-stopping
      if (document.hidden && mediaRecorderRef.current?.state === 'recording') {
        try { mediaRecorderRef.current.stop() } catch { }
        setState(prev => ({ ...prev, isListening: false }))
      } else if (!document.hidden && state.isConnected && autoRestartRef.current) {
        setTimeout(() => startListening(), 500)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      autoRestartRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const toggleVideo = async () => {
    if (state.isVideoEnabled && videoStreamRef.current) {
      // Turn off video
      videoStreamRef.current.getTracks().forEach(track => track.stop())
      videoStreamRef.current = null
      setState(prev => ({ ...prev, videoStream: null, isVideoEnabled: false }))
    } else {
      // Turn on video
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        })
        videoStreamRef.current = videoStream
        setState(prev => ({ ...prev, videoStream: videoStream, isVideoEnabled: true }))
      } catch (e) {
        console.error('Failed to enable camera:', e)
      }
    }
  }

  return {
    ...state,
    startInterview,
    stopInterview,
    startListening,
    stopListening,
    setAutoRestart,
    requestMicAccess,
    enableAudioPlayback,
    getEvaluation,
    toggleVideo
  }
}

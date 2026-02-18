import express from 'express'
import { supabase } from '../supabase.js'
import { generateAIResponse, generateInitialQuestion } from '../services/gemini.js'
import { recognizeSpeech, synthesizeSpeech } from '../services/speech.js'

const router = express.Router()
const sessionData: Record<string, any> = {}

// Start interview session
router.post('/start', async (req, res) => {
  try {
    const { userId, interviewType, techStack, duration, field, difficulty, questionCount, timeLimit } = req.body

    if (!userId || !interviewType) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Create interview session
    let sessionId: string | null = null
    let sessionError: any = null
    try {
      const { data: session, error } = await supabase
        .from('interview_sessions')
        .insert({
          user_id: userId,
          type: interviewType,
          tech_stack: techStack || [],
          duration: duration || 30,
          status: 'active'
        })
        .select()
        .single()
      if (error) sessionError = error
      sessionId = session?.id || null
    } catch (e) {
      sessionError = e
    }
    if (!sessionId) {
      sessionId = `demo-${Date.now()}`
    }

    // Generate initial question
    const initialGreeting = await generateInitialQuestion(interviewType, techStack || [])

    const tts = await synthesizeSpeech(initialGreeting)
    const initialAudioData = tts.audioContent.toString('base64')

    sessionData[sessionId] = {
      config: {
        field: field || 'general',
        difficulty: difficulty || 'intermediate',
        questionCount: questionCount || 5,
        timeLimit: timeLimit || 10,
        interviewType,
        techStack: techStack || []
      },
      conversationHistory: [{ speaker: 'ai', text: initialGreeting }],
      phase: 'greeting',
      questionNumber: 0,
      startTime: Date.now()
    }

    // Store initial AI turn
    if (!sessionId.startsWith('demo-')) {
      await supabase.from('conversation_turns').insert({
        session_id: sessionId,
        speaker_type: 'ai',
        text: initialGreeting,
        confidence: 1.0
      })
    }

    res.json({
      sessionId,
      initialGreeting,
      initialAudioData,
      config: sessionData[sessionId].config,
      status: 'ready'
    })
  } catch (error) {
    console.error('Error starting interview:', error)
    res.status(500).json({ error: 'Failed to start interview' })
  }
})

// Process voice input
router.post('/voice', async (req, res) => {
  try {
    const { audioData, sessionId, interviewType } = req.body

    if (!audioData || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const audioBuffer = Buffer.from(audioData, 'base64')
    const stt = await recognizeSpeech(audioBuffer, 16000, 'en-US', 'WEBM_OPUS')

    const session = sessionData[sessionId] || {
      config: { questionCount: 5, timeLimit: 10, field: 'general', difficulty: 'intermediate' },
      conversationHistory: [],
      phase: 'greeting',
      questionNumber: 0,
      startTime: Date.now()
    }

    const history = session.conversationHistory
    const config = session.config
    let phase = session.phase
    let questionNumber = session.questionNumber

    const userTranscript = stt.transcript || ''
    if (!userTranscript || userTranscript.trim().length < 5) {
      history.push({ speaker: 'user', text: userTranscript })
      const repeatMsg = "I couldn’t hear that clearly. Please repeat your answer."
      const tts = await synthesizeSpeech(repeatMsg)
      const audioOut = tts.audioContent.toString('base64')
      sessionData[sessionId] = { ...session, conversationHistory: history, phase, questionNumber }
      return res.json({
        userTranscript,
        aiResponse: repeatMsg,
        audioData: audioOut,
        conversationHistory: history,
        questionNumber,
        totalQuestions: config.questionCount,
        phase,
        shouldEnd: false,
        timeRemaining: Math.max(0, (config.timeLimit * 60) - Math.floor((Date.now() - session.startTime) / 1000))
      })
    }

    history.push({ speaker: 'user', text: userTranscript })

    const elapsedMs = Date.now() - session.startTime
    const timeRemaining = (config.timeLimit * 60) - Math.floor(elapsedMs / 1000)
    if (phase === 'greeting') { phase = 'questions'; questionNumber = 1 } else if (phase === 'questions') { questionNumber += 1 }
    const shouldEnd = questionNumber > (config.questionCount) || timeRemaining < 30
    if (shouldEnd) phase = 'ending'

    const context = {
      sessionId,
      interviewType: (interviewType || 'technical') as 'behavioral' | 'technical',
      techStack: config.techStack || [],
      previousTurns: history.map((h: any) => ({ speaker: h.speaker, text: h.text, timestamp: new Date().toISOString() }))
    }
    const ai = await generateAIResponse(userTranscript, context)
    const aiResponse = ai.response
    history.push({ speaker: 'ai', text: aiResponse })
    sessionData[sessionId] = { ...session, conversationHistory: history, phase, questionNumber }

    const tts = await synthesizeSpeech(aiResponse)
    const audioOut = tts.audioContent.toString('base64')

    if (!sessionId.startsWith('demo-')) {
      await supabase.from('conversation_turns').insert({ session_id: sessionId, speaker_type: 'user', text: userTranscript, confidence: stt.confidence })
      await supabase.from('conversation_turns').insert({ session_id: sessionId, speaker_type: 'ai', text: aiResponse, confidence: 1.0 })
    }

    return res.json({
      userTranscript,
      aiResponse,
      audioData: audioOut,
      conversationHistory: history,
      questionNumber,
      totalQuestions: config.questionCount,
      phase,
      shouldEnd,
      timeRemaining: Math.max(0, timeRemaining)
    })
  } catch (error) {
    console.error('Error processing voice:', error)
    res.status(500).json({ error: 'Failed to process voice' })
  }
})

// Generate AI response
router.post('/voice_stream', async (req, res) => {
  try {
    const { audioData, sessionId, interviewType } = req.body
    if (!audioData || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    const audioBuffer = Buffer.from(audioData, 'base64')
    const stt = await recognizeSpeech(audioBuffer, 16000, 'en-US', 'WEBM_OPUS')
    const session = sessionData[sessionId]
    const history = session?.conversationHistory || []
    const config = session?.config || { questionCount: 5, timeLimit: 10, field: 'general', difficulty: 'intermediate', techStack: [] }
    const elapsedMs = Date.now() - (session?.startTime || Date.now())
    const timeRemaining = (config.timeLimit * 60) - Math.floor(elapsedMs / 1000)
    let phase = session?.phase || 'greeting'
    let questionNumber = session?.questionNumber || 0
    const userTranscript = stt.transcript || ''
    if (userTranscript) history.push({ speaker: 'user', text: userTranscript })
    if (phase === 'greeting') { phase = 'questions'; questionNumber = 1 } else if (phase === 'questions') { questionNumber += 1 }
    const shouldEnd = questionNumber > (config.questionCount) || timeRemaining < 30
    if (shouldEnd) phase = 'ending'
    const ctx = { sessionId, interviewType: (interviewType || 'technical') as 'behavioral' | 'technical', techStack: config.techStack || [], previousTurns: history.map((h: any) => ({ speaker: h.speaker, text: h.text, timestamp: new Date().toISOString() })) }
    const ai = await generateAIResponse(userTranscript, ctx)
    const aiText = ai.response
    history.push({ speaker: 'ai', text: aiText })
    sessionData[sessionId] = { ...(session||{}), conversationHistory: history, phase, questionNumber }
    const tts = await synthesizeSpeech(aiText)
    const audioOut = tts.audioContent.toString('base64')
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ type: 'final', aiResponse: aiText, audioData: audioOut, questionNumber, totalQuestions: config.questionCount, phase, shouldEnd, timeRemaining: Math.max(0, timeRemaining) }) + '\n')
    res.end()
  } catch (error) {
    console.error('Error generating AI response:', error)
    res.status(500).json({ error: 'Failed to process voice stream' })
  }
})

// End interview session
router.post('/caption', async (req, res) => {
  try {
    const { audioData, sessionId } = req.body

    if (!audioData) {
      return res.status(400).json({ error: 'Missing audio data' })
    }
    const audioBuffer = Buffer.from(audioData, 'base64')
    const stt = await recognizeSpeech(audioBuffer, 16000, 'en-US', 'WEBM_OPUS')
    res.json({ transcript: stt.transcript || '' })
  } catch (error) {
    console.error('Error captioning:', error)
    res.status(500).json({ error: 'Failed to caption audio' })
  }
})

router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' })
    }
    delete sessionData[sessionId]
    const { error } = await supabase
      .from('interview_sessions')
      .update({ status: 'completed', end_time: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) throw error
    res.json({ status: 'completed' })
  } catch (error) {
    console.error('Error ending interview:', error)
    res.status(500).json({ error: 'Failed to end interview' })
  }
})

export default router

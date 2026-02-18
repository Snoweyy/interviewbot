import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface InterviewContext {
  sessionId: string
  interviewType: 'behavioral' | 'technical'
  techStack: string[]
  previousTurns: Array<{
    speaker: 'user' | 'ai'
    text: string
    timestamp: string
  }>
}

export interface AIResponse {
  response: string
  nextQuestion?: string
  metrics: {
    relevance: number
    depth: number
    clarity: number
    overall: number
  }
}

export async function generateAIResponse(
  transcript: string,
  context: InterviewContext
): Promise<AIResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `You are an AI interviewer conducting a ${context.interviewType} interview.
  
Interview Type: ${context.interviewType}
Tech Stack: ${context.techStack.join(', ')}

Previous conversation:
${context.previousTurns.map(turn => `${turn.speaker}: ${turn.text}`).join('\n')}

Current candidate response: ${transcript}

Please provide:
1. A natural, conversational response as the interviewer
2. A follow-up question if appropriate
3. Evaluation metrics (1-10 scale) for:
   - Relevance to the question
   - Depth of response
   - Clarity of communication

Respond in this JSON format:
{
  "response": "Your interviewer response",
  "nextQuestion": "Follow-up question or null",
  "metrics": {
    "relevance": 8,
    "depth": 7,
    "clarity": 9,
    "overall": 8
  }
}`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Error generating AI response:', error)
    // Fallback response
    return {
      response: "That's an interesting response. Can you elaborate on that?",
      nextQuestion: "Can you provide more details about your experience?",
      metrics: {
        relevance: 5,
        depth: 5,
        clarity: 5,
        overall: 5
      }
    }
  }
}

export async function generateInitialQuestion(
  interviewType: 'behavioral' | 'technical',
  techStack: string[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  const prompt = `Generate an opening question for a ${interviewType} interview.
  
Context: ${interviewType === 'technical' ? `Focus on ${techStack.join(', ')}` : 'Focus on behavioral competencies'}

Provide a warm, professional introduction and first question. Keep it concise and engaging.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  } catch (error) {
    console.error('Error generating initial question:', error)
    return "Hello! I'm excited to learn more about your background. Could you tell me about yourself and what brings you here today?"
  }
}
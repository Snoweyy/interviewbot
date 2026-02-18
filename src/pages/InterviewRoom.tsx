import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Mic, MicOff, PhoneOff, Bot, User, Volume2, VolumeX, Loader2, Clock, HelpCircle, AlertTriangle, Video, VideoOff } from 'lucide-react'
import { useVoiceInterview, InterviewConfig } from '../hooks/useVoiceInterview'

export default function InterviewRoom() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMuted, setIsMuted] = useState(false)
  const [autoMode, setAutoMode] = useState(true)
  const [paused, setPaused] = useState(false)
  const [showEndWarning, setShowEndWarning] = useState(false)

  // Get config from navigation state
  const configFromState = location.state?.config as InterviewConfig | undefined

  const {
    startInterview,
    stopInterview,
    startListening,
    stopListening,
    setAutoRestart,
    requestMicAccess,
    enableAudioPlayback,
    getEvaluation,
    toggleVideo,
    isConnected,
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    aiResponse,
    conversationHistory,
    error,
    audioUnlockRequired,
    questionNumber,
    totalQuestions,
    phase,
    timeRemaining,
    shouldEnd,
    config,
    videoStream,
    isVideoEnabled
  } = useVoiceInterview()

  // Video ref for displaying camera feed
  const videoRef = useRef<HTMLVideoElement>(null)

  // Attach video stream to video element
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream
    }
  }, [videoStream])

  // Redirect to dashboard if no config
  useEffect(() => {
    if (!configFromState) {
      navigate('/')
      return
    }

    // Initialize interview
    startInterview(configFromState)

    return () => {
      stopInterview()
    }
  }, [])

  useEffect(() => {
    setAutoRestart(autoMode)
  }, [autoMode, setAutoRestart])

  // Show warning when time is almost up
  useEffect(() => {
    if (timeRemaining <= 30 && timeRemaining > 0 && !showEndWarning) {
      setShowEndWarning(true)
    }
  }, [timeRemaining, showEndWarning])

  // Handle interview ending
  useEffect(() => {
    if (shouldEnd && phase === 'ending') {
      // Wait for AI to finish speaking, then navigate to results
      const timer = setTimeout(async () => {
        if (!isSpeaking) {
          const evaluation = await getEvaluation()
          navigate('/results', {
            state: {
              evaluation,
              config: configFromState
            }
          })
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [shouldEnd, phase, isSpeaking])

  const handleToggleListening = () => {
    if (isProcessing || isSpeaking) return

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleEndInterview = async () => {
    const evaluation = await getEvaluation()
    await stopInterview()
    navigate('/results', {
      state: {
        evaluation,
        config: configFromState
      }
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusText = () => {
    if (isSpeaking) return 'AI is speaking...'
    if (isProcessing) return 'Processing your response...'
    if (isListening) return 'Listening to you...'
    return 'Click mic to speak'
  }

  const getStatusColor = () => {
    if (isSpeaking) return 'text-purple-400'
    if (isProcessing) return 'text-yellow-400'
    if (isListening) return 'text-green-400'
    return 'text-gray-400'
  }

  const getPhaseLabel = () => {
    switch (phase) {
      case 'greeting': return 'Introduction'
      case 'questions': return `Question ${questionNumber} of ${totalQuestions}`
      case 'ending': return 'Wrapping Up'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 border-b border-purple-800/30">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">
              {configFromState?.field ? configFromState.field.charAt(0).toUpperCase() + configFromState.field.slice(1) : 'Technical'} Interview
            </h1>
            <div className="flex space-x-2 mt-1">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full capitalize">
                {configFromState?.difficulty || 'intermediate'}
              </span>
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                {getPhaseLabel()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Timer */}
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${timeRemaining <= 60 ? 'bg-red-600/30 text-red-400' : 'bg-gray-800'
            }`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
          {/* Question Counter */}
          <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-full">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span className="text-sm">{questionNumber}/{totalQuestions}</span>
          </div>
          {/* Auto Mode Toggle */}
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${autoMode
              ? 'bg-green-600/30 text-green-400 border border-green-500/50'
              : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
              }`}
          >
            {autoMode ? '🎤 Hands-free ON' : '🎤 Hands-free OFF'}
          </button>
          <button
            onClick={() => {
              if (paused) {
                setPaused(false)
                setAutoRestart(true)
                startListening()
              } else {
                setPaused(true)
                setAutoRestart(false)
                stopListening()
              }
            }}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${paused
              ? 'bg-yellow-600/30 text-yellow-400 border border-yellow-500/50'
              : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
              }`}
          >
            {paused ? 'Resume Mic' : 'Pause Mic'}
          </button>
          {audioUnlockRequired && (
            <button
              onClick={() => enableAudioPlayback()}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-full text-sm text-white"
            >
              Enable Audio
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-8">

        {/* Time Warning */}
        {showEndWarning && timeRemaining > 0 && (
          <div className="w-full max-w-4xl mb-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 flex items-center space-x-3 text-yellow-200 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
            <span>Time is almost up! The interview will end shortly.</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="w-full max-w-4xl mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3 text-red-200 animate-in fade-in slide-in-from-top-4">
            <div className="bg-red-500 rounded-full p-1">
              <MicOff className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Microphone Error</h3>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => requestMicAccess()}
              className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs text-white transition-colors"
            >
              Request Mic Access
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl w-full">

          {/* AI Interviewer Panel */}
          <div className="bg-gradient-to-br from-purple-800/50 to-purple-900/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-600/30">
            <div className="flex flex-col items-center text-center">
              <div className={`w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mb-4 ${isSpeaking ? 'animate-pulse ring-4 ring-purple-400/50' : ''}`}>
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">AI Interviewer</h2>
              <div className="flex items-center space-x-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                <span className="text-sm text-gray-300">{isConnected ? 'Connected' : 'Connecting...'}</span>
              </div>

              {/* AI Response */}
              <div className="bg-purple-700/30 rounded-lg p-4 mb-4 w-full min-h-[120px]">
                {isSpeaking && (
                  <div className="flex items-center justify-center mb-2">
                    <Volume2 className="w-5 h-5 text-purple-400 animate-pulse mr-2" />
                    <span className="text-purple-300 text-sm">Speaking...</span>
                  </div>
                )}
                <p className="text-sm">{aiResponse || 'Starting interview...'}</p>
              </div>

              {/* Voice Activity Indicator */}
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-150 ${isSpeaking ? 'bg-purple-400 animate-pulse' : 'bg-purple-600'
                      }`}
                    style={{
                      animationDelay: `${i * 0.1}s`,
                      height: isSpeaking ? `${Math.random() * 24 + 8}px` : '16px'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* User Panel */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30">
            <div className="flex flex-col items-center text-center">
              {/* Video Preview or User Icon */}
              <div className={`relative w-40 h-32 rounded-xl overflow-hidden mb-4 ${isListening ? 'ring-4 ring-green-400/50' : ''}`}>
                {isVideoEnabled && videoStream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
                {/* Video status indicator */}
                <div className={`absolute bottom-2 right-2 w-3 h-3 rounded-full ${isVideoEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <h2 className="text-xl font-semibold mb-2">You</h2>
              <div className="flex items-center space-x-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : isMuted ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                <span className="text-sm text-gray-300">
                  {isListening ? 'Recording...' : isMuted ? 'Muted' : 'Ready'}
                </span>
              </div>

              {/* Transcript */}
              <div className="bg-gray-700/30 rounded-lg p-4 mb-4 w-full min-h-[120px]">
                {isListening && (
                  <div className="flex items-center justify-center mb-2">
                    <Mic className="w-5 h-5 text-green-400 animate-pulse mr-2" />
                    <span className="text-green-300 text-sm">Listening...</span>
                  </div>
                )}
                {isProcessing && (
                  <div className="flex items-center justify-center mb-2">
                    <Loader2 className="w-5 h-5 text-yellow-400 animate-spin mr-2" />
                    <span className="text-yellow-300 text-sm">Processing...</span>
                  </div>
                )}
                <p className="text-sm">{transcript || 'Your speech will appear here...'}</p>
              </div>

              {/* Voice & Video Controls */}
              <div className="flex space-x-4">
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition-colors ${isVideoEnabled
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full transition-colors ${isMuted
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                <button
                  onClick={handleToggleListening}
                  disabled={isProcessing || isSpeaking}
                  className={`p-4 rounded-full transition-all ${isListening
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse ring-4 ring-red-400/30'
                    : 'bg-green-600 hover:bg-green-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 px-6 py-3 bg-gray-800/50 rounded-full">
          <span className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</span>
        </div>

        {/* Conversation History */}
        {conversationHistory.length > 0 && (
          <div className="mt-8 max-w-4xl w-full">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/30 max-h-60 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Conversation</h3>
              <div className="space-y-3">
                {conversationHistory.map((turn, index) => (
                  <div key={index} className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${turn.speaker === 'user'
                      ? 'bg-blue-600/30 text-blue-100'
                      : 'bg-purple-600/30 text-purple-100'
                      }`}>
                      <span className="text-xs font-semibold mb-1 block opacity-70">
                        {turn.speaker === 'user' ? 'You' : 'Interviewer'}
                      </span>
                      <p className="text-sm">{turn.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* End Interview Button */}
        <div className="mt-8">
          <button
            onClick={handleEndInterview}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-semibold transition-colors flex items-center space-x-2"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Interview</span>
          </button>
        </div>
      </div>
    </div>
  )
}

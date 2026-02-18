import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Clock, Target, Layers, Play, Sparkles } from 'lucide-react'

interface InterviewConfig {
    field: string
    difficulty: 'beginner' | 'intermediate' | 'advanced'
    questionCount: number
    timeLimit: number
}

const FIELDS = [
    { value: 'react', label: 'React.js', icon: '⚛️' },
    { value: 'nodejs', label: 'Node.js', icon: '🟢' },
    { value: 'python', label: 'Python', icon: '🐍' },
    { value: 'javascript', label: 'JavaScript', icon: '💛' },
    { value: 'typescript', label: 'TypeScript', icon: '💙' },
    { value: 'java', label: 'Java', icon: '☕' },
    { value: 'sql', label: 'SQL & Databases', icon: '🗄️' },
    { value: 'system-design', label: 'System Design', icon: '🏗️' },
    { value: 'dsa', label: 'Data Structures & Algorithms', icon: '📊' },
    { value: 'devops', label: 'DevOps & Cloud', icon: '☁️' },
]

const DIFFICULTIES = [
    { value: 'beginner', label: 'Beginner', description: 'Basic concepts & fundamentals', color: 'from-green-500 to-emerald-600' },
    { value: 'intermediate', label: 'Intermediate', description: 'Applied knowledge & patterns', color: 'from-yellow-500 to-orange-600' },
    { value: 'advanced', label: 'Advanced', description: 'Deep expertise & edge cases', color: 'from-red-500 to-pink-600' },
]

const TIME_OPTIONS = [
    { value: 5, label: '5 minutes', description: 'Quick session' },
    { value: 10, label: '10 minutes', description: 'Standard' },
    { value: 15, label: '15 minutes', description: 'In-depth' },
    { value: 30, label: '30 minutes', description: 'Comprehensive' },
]

export default function Dashboard() {
    const navigate = useNavigate()
    const [config, setConfig] = useState<InterviewConfig>({
        field: '',
        difficulty: 'intermediate',
        questionCount: 5,
        timeLimit: 10
    })
    const [error, setError] = useState<string | null>(null)

    const handleStartInterview = () => {
        if (!config.field) {
            setError('Please select a field for your interview')
            return
        }
        if (config.questionCount < 3 || config.questionCount > 20) {
            setError('Please select between 3 and 20 questions')
            return
        }
        setError(null)
        navigate('/interview', { state: { config } })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between p-6 border-b border-purple-800/30">
                <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            AI Interview Practice
                        </h1>
                        <p className="text-gray-400 text-sm">Powered by Gemini</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-4xl mx-auto p-8">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold mb-3">Configure Your Interview</h2>
                    <p className="text-gray-400">Set up your practice session and start improving</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                        {error}
                    </div>
                )}

                <div className="space-y-8">
                    {/* Field Selection */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-center space-x-3 mb-4">
                            <Target className="w-5 h-5 text-purple-400" />
                            <h3 className="text-lg font-semibold">Select Interview Field</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {FIELDS.map((field) => (
                                <button
                                    key={field.value}
                                    onClick={() => setConfig({ ...config, field: field.value })}
                                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${config.field === field.value
                                            ? 'border-purple-500 bg-purple-500/20 scale-105'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-700/50'
                                        }`}
                                >
                                    <div className="text-2xl mb-2">{field.icon}</div>
                                    <div className="text-sm font-medium">{field.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-center space-x-3 mb-4">
                            <Layers className="w-5 h-5 text-purple-400" />
                            <h3 className="text-lg font-semibold">Difficulty Level</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {DIFFICULTIES.map((diff) => (
                                <button
                                    key={diff.value}
                                    onClick={() => setConfig({ ...config, difficulty: diff.value as InterviewConfig['difficulty'] })}
                                    className={`p-5 rounded-xl border-2 transition-all duration-200 text-left ${config.difficulty === diff.value
                                            ? 'border-purple-500 bg-purple-500/20 scale-105'
                                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                        }`}
                                >
                                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${diff.color} mb-3`}></div>
                                    <div className="font-semibold mb-1">{diff.label}</div>
                                    <div className="text-sm text-gray-400">{diff.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Questions & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Question Count */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center space-x-3 mb-4">
                                <Mic className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-semibold">Number of Questions</h3>
                            </div>
                            <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    min="3"
                                    max="20"
                                    value={config.questionCount}
                                    onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) })}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                                <span className="text-2xl font-bold text-purple-400 min-w-[3rem] text-center">
                                    {config.questionCount}
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">
                                {config.questionCount <= 5 ? 'Quick practice' : config.questionCount <= 10 ? 'Standard session' : 'Deep dive'}
                            </p>
                        </div>

                        {/* Time Limit */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                            <div className="flex items-center space-x-3 mb-4">
                                <Clock className="w-5 h-5 text-purple-400" />
                                <h3 className="text-lg font-semibold">Time Limit</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {TIME_OPTIONS.map((time) => (
                                    <button
                                        key={time.value}
                                        onClick={() => setConfig({ ...config, timeLimit: time.value })}
                                        className={`p-3 rounded-lg border transition-all ${config.timeLimit === time.value
                                                ? 'border-purple-500 bg-purple-500/20'
                                                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="font-semibold">{time.label}</div>
                                        <div className="text-xs text-gray-400">{time.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary & Start */}
                    <div className="bg-gradient-to-r from-purple-800/50 to-blue-800/50 backdrop-blur-sm rounded-2xl p-6 border border-purple-600/30">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h3 className="text-lg font-semibold mb-2">Ready to Start?</h3>
                                <p className="text-gray-300">
                                    {config.field ? (
                                        <>
                                            <span className="text-purple-400">{FIELDS.find(f => f.value === config.field)?.label}</span>
                                            {' • '}
                                            <span className="capitalize">{config.difficulty}</span>
                                            {' • '}
                                            {config.questionCount} questions
                                            {' • '}
                                            {config.timeLimit} min
                                        </>
                                    ) : (
                                        'Select a field to get started'
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={handleStartInterview}
                                disabled={!config.field}
                                className={`px-8 py-4 rounded-full font-semibold text-lg transition-all flex items-center space-x-3 ${config.field
                                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 hover:scale-105 shadow-lg shadow-purple-500/25'
                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <Play className="w-5 h-5" />
                                <span>Start Interview</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

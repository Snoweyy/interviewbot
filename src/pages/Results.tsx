import { useLocation, useNavigate } from 'react-router-dom'
import { Trophy, Target, TrendingUp, AlertCircle, CheckCircle, ArrowLeft, RotateCcw } from 'lucide-react'

interface EvaluationResult {
    overallScore: number
    categories: {
        name: string
        score: number
        feedback: string
    }[]
    strengths: string[]
    improvements: string[]
    summary: string
}

export default function Results() {
    const location = useLocation()
    const navigate = useNavigate()
    const { evaluation, config } = location.state || {}

    // Default/loading state if no evaluation
    const result: EvaluationResult = evaluation || {
        overallScore: 0,
        categories: [],
        strengths: [],
        improvements: [],
        summary: 'Interview evaluation is being processed...'
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-400'
        if (score >= 60) return 'text-yellow-400'
        return 'text-red-400'
    }

    const getScoreGradient = (score: number) => {
        if (score >= 80) return 'from-green-500 to-emerald-600'
        if (score >= 60) return 'from-yellow-500 to-orange-600'
        return 'from-red-500 to-pink-600'
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between p-6 border-b border-purple-800/30">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Interview Results</h1>
                        <p className="text-gray-400 text-sm">
                            {config?.field && `${config.field} • ${config.difficulty}`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center space-x-2 transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    <span>New Interview</span>
                </button>
            </header>

            {/* Main Content */}
            <div className="relative z-10 max-w-4xl mx-auto p-8">
                {/* Overall Score */}
                <div className="bg-gradient-to-r from-purple-800/50 to-blue-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-600/30 mb-8 text-center">
                    <Trophy className={`w-16 h-16 mx-auto mb-4 ${getScoreColor(result.overallScore)}`} />
                    <h2 className="text-lg text-gray-300 mb-2">Overall Performance</h2>
                    <div className={`text-6xl font-bold bg-gradient-to-r ${getScoreGradient(result.overallScore)} bg-clip-text text-transparent`}>
                        {result.overallScore}%
                    </div>
                    <p className="text-gray-400 mt-4 max-w-xl mx-auto">{result.summary}</p>
                </div>

                {/* Categories Breakdown */}
                {result.categories.length > 0 && (
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-6">
                        <div className="flex items-center space-x-3 mb-6">
                            <Target className="w-5 h-5 text-purple-400" />
                            <h3 className="text-lg font-semibold">Performance by Category</h3>
                        </div>
                        <div className="space-y-4">
                            {result.categories.map((category, index) => (
                                <div key={index}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-medium">{category.name}</span>
                                        <span className={`font-bold ${getScoreColor(category.score)}`}>
                                            {category.score}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full bg-gradient-to-r ${getScoreGradient(category.score)} rounded-full transition-all duration-1000`}
                                            style={{ width: `${category.score}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-400">{category.feedback}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Strengths */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-center space-x-3 mb-4">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <h3 className="text-lg font-semibold">Strengths</h3>
                        </div>
                        <ul className="space-y-3">
                            {result.strengths.length > 0 ? (
                                result.strengths.map((strength, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                                        <span className="text-gray-300">{strength}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-500">Analyzing your strengths...</li>
                            )}
                        </ul>
                    </div>

                    {/* Areas for Improvement */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
                        <div className="flex items-center space-x-3 mb-4">
                            <TrendingUp className="w-5 h-5 text-yellow-400" />
                            <h3 className="text-lg font-semibold">Areas to Improve</h3>
                        </div>
                        <ul className="space-y-3">
                            {result.improvements.length > 0 ? (
                                result.improvements.map((improvement, index) => (
                                    <li key={index} className="flex items-start space-x-2">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                                        <span className="text-gray-300">{improvement}</span>
                                    </li>
                                ))
                            ) : (
                                <li className="text-gray-500">Identifying areas for growth...</li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-900/30 backdrop-blur-sm rounded-2xl p-6 border border-blue-600/30">
                    <div className="flex items-center space-x-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold">Pro Tips</h3>
                    </div>
                    <div className="text-gray-300 space-y-2">
                        <p>• Practice explaining your thought process out loud while solving problems</p>
                        <p>• Focus on one improvement area at a time for better retention</p>
                        <p>• Record yourself and review to identify verbal patterns</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

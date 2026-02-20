import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import s from './Result.module.css'

export default function Result() {
    const result = JSON.parse(sessionStorage.getItem('interviewResult') || '{}')
    const qaPairs = JSON.parse(sessionStorage.getItem('interviewQA') || '[]')
    const ringRef = useRef()

    useEffect(() => {
        if (result.overall_score && ringRef.current) {
            setTimeout(() => {
                const offset = 352 - (352 * result.overall_score / 100)
                ringRef.current.style.strokeDashoffset = offset
            }, 150)
        }
    }, [])

    const metrics = [
        { key: 'communication', label: 'Communication', icon: '🗣️' },
        { key: 'relevance', label: 'Answer Relevance', icon: '🎯' },
        { key: 'confidence', label: 'Confidence', icon: '💪' },
        { key: 'domain_knowledge', label: 'Domain Knowledge', icon: '📚' },
    ]

    if (!result.overall_score) {
        return (
            <div className={s.wrap}>
                <div className={s.card}>
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <div style={{ fontSize: '3rem' }}>😕</div>
                        <h2 style={{ margin: '1rem 0' }}>No results found</h2>
                        <p style={{ color: 'var(--text2)', marginBottom: '1.5rem' }}>Please complete an interview first.</p>
                        <Link to="/" className={s.btnPrimary}>Start Interview</Link>
                    </div>
                </div>
            </div>
        )
    }

    const chance = Math.min(result.selection_chance || 0, 95)

    return (
        <div className={s.wrap}>
            <div className={s.steps}>
                {[0, 1, 2, 3].map(i => <div key={i} className={`${s.step} ${s.done}`} />)}
            </div>

            <div className={`${s.card} ${s.cardWide}`}>
                {/* Header */}
                <div className={s.header}>
                    <div className={s.avatar}>🎓</div>
                    <div className={s.name}>{result.name || 'Candidate'}</div>
                    <div className={s.meta}>{result.field} · {result.level} · {result.totalQuestions} Questions</div>
                    <div className={s.tokenBadge}>🔑 Token: <span>{result.token_id}</span></div>
                </div>

                <hr className={s.divider} />

                {/* Score ring */}
                <div className={s.scoreSection}>
                    <div className={s.ringWrap}>
                        <svg className={s.ring} viewBox="0 0 120 120">
                            <defs>
                                <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#6c63ff" />
                                    <stop offset="100%" stopColor="#38bdf8" />
                                </linearGradient>
                            </defs>
                            <circle className={s.ringBg} cx="60" cy="60" r="56" />
                            <circle ref={ringRef} className={s.ringFill} cx="60" cy="60" r="56" />
                        </svg>
                        <div className={s.ringCenter}>
                            <div className={s.ringScore}>{result.overall_score}</div>
                            <div className={s.ringLabel}>Overall Score</div>
                        </div>
                    </div>
                </div>

                {/* Chance */}
                <div className={s.chanceCard}>
                    <div className={s.chancePct}>{chance}%</div>
                    <div className={s.chanceLabel}>Estimated Chance of Selection</div>
                </div>

                <hr className={s.divider} />

                {/* Metrics */}
                <h3 className={s.sectionTitle}>Score Breakdown</h3>
                <div className={s.metrics}>
                    {metrics.map(m => {
                        const val = result[m.key] || 0
                        const color = val >= 70 ? 'var(--success)' : val >= 45 ? 'var(--warning)' : 'var(--danger)'
                        return (
                            <div key={m.key} className={s.metricRow}>
                                <div className={s.metricName}>{m.icon} {m.label}</div>
                                <div className={s.progressBar}>
                                    <div className={s.progressFill} style={{ width: `${val}%`, background: color }} />
                                </div>
                                <div className={s.metricVal} style={{ color }}>{val}</div>
                            </div>
                        )
                    })}
                </div>

                <hr className={s.divider} />

                {/* Summary */}
                <div className={s.summary}>{result.summary}</div>

                {/* Strengths & Improvements */}
                <div className={s.listsGrid}>
                    <div className={s.listCard}>
                        <h3>✅ Strengths</h3>
                        <ul>{(result.strengths || []).map((x, i) => <li key={i}><span>✅</span>{x}</li>)}</ul>
                    </div>
                    <div className={s.listCard}>
                        <h3>📈 Improve</h3>
                        <ul>{(result.improvements || []).map((x, i) => <li key={i}><span>📌</span>{x}</li>)}</ul>
                    </div>
                </div>

                {/* Q&A Transcript */}
                {qaPairs.length > 0 && (
                    <>
                        <hr className={s.divider} />
                        <h3 className={s.sectionTitle}>📝 Interview Transcript</h3>
                        <div className={s.qaList}>
                            {qaPairs.map((qa, i) => (
                                <div key={i} className={s.qaItem}>
                                    <div className={s.qaQ}>
                                        <span className={s.qaNum}>{i === 0 ? 'Intro' : `Q${i}`}</span>
                                        {qa.question}
                                    </div>
                                    <div className={`${s.qaA} ${qa.answer === '(Skipped)' ? s.skipped : ''}`}>
                                        <span className={s.qaALabel}>A:</span>
                                        {qa.answer || '(No answer given)'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <hr className={s.divider} />

                <div className={s.actions}>
                    <button className={s.btnPrimary} onClick={() => window.print()}>🖨️ Download / Print</button>
                    <Link to="/" className={s.btnSecondary}>🔄 Start New Interview</Link>
                </div>
            </div>
        </div>
    )
}

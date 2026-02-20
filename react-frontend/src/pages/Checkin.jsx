import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import s from './Checkin.module.css'

export default function Checkin() {
    const navigate = useNavigate()
    const config = JSON.parse(sessionStorage.getItem('interviewConfig') || '{}')
    const videoRef = useRef()

    const [camOk, setCamOk] = useState(false)
    const [micOk, setMicOk] = useState(false)
    const [queReady, setQueReady] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!config.field) { navigate('/'); return }
        requestPerms()
    }, [])

    async function requestPerms() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            videoRef.current.srcObject = stream
            setCamOk(true)
            setMicOk(true)
            generateQuestions()
        } catch (err) {
            setError(err.name === 'NotAllowedError'
                ? 'Permission denied. Please allow camera & mic in browser settings.'
                : 'Could not access camera/mic: ' + err.message)
        }
    }

    async function generateQuestions() {
        setLoading(true)
        try {
            const res = await fetch('/api/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: config.field, level: config.level, total: config.total })
            })
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            sessionStorage.setItem('questions', JSON.stringify(data.questions))
            setQueReady(true)
        } catch (err) {
            setError('❌ ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const canProceed = camOk && micOk && queReady

    return (
        <div className={s.wrap}>
            <div className={s.card}>
                <div className={s.steps}>
                    <div className={`${s.step} ${s.done}`} />
                    <div className={`${s.step} ${s.active}`} />
                    <div className={s.step} />
                    <div className={s.step} />
                </div>

                <div className={s.logoArea}>
                    <div className={s.logoIcon}>📋</div>
                    <h1>Check-In</h1>
                    <p>{config.field} · {config.level} · {config.total} Questions · {config.maxtime} min</p>
                </div>

                {error && <div className={s.alertError}>{error}</div>}

                <div className={s.permGrid}>
                    <div className={`${s.permCard} ${camOk ? s.granted : ''}`}>
                        <div className={s.permIcon}>📷</div>
                        <div style={{ fontWeight: 600 }}>Camera</div>
                        <div className={s.permStatus}>{camOk ? 'Granted ✓' : 'Waiting...'}</div>
                    </div>
                    <div className={`${s.permCard} ${micOk ? s.granted : ''}`}>
                        <div className={s.permIcon}>🎤</div>
                        <div style={{ fontWeight: 600 }}>Microphone</div>
                        <div className={s.permStatus}>{micOk ? 'Granted ✓' : 'Waiting...'}</div>
                    </div>
                </div>

                <video ref={videoRef} autoPlay muted playsInline
                    className={s.preview} style={{ display: camOk ? 'block' : 'none' }} />

                {loading && (
                    <div className={s.loadingBox}>
                        <div className={s.spinner} />
                        <div>🤖 AI is preparing your questions...</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>This may take 20–40 seconds</div>
                    </div>
                )}
                {queReady && <div className={s.alertSuccess}>✅ Questions ready! You're all set.</div>}

                <hr className={s.divider} />

                <button
                    className={s.btnPrimary}
                    disabled={!canProceed}
                    onClick={() => {
                        if (videoRef.current?.srcObject)
                            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
                        navigate('/interview')
                    }}
                >
                    {canProceed ? 'Start Interview →' : loading ? 'Preparing questions...' : 'Allow Permissions First'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
                    <Link to="/" style={{ color: 'var(--text3)', fontSize: '0.85rem', textDecoration: 'none' }}>
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    )
}

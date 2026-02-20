import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import s from './Interview.module.css'

export default function Interview() {
    const navigate = useNavigate()
    const config = JSON.parse(sessionStorage.getItem('interviewConfig') || '{}')
    const questions = JSON.parse(sessionStorage.getItem('questions') || '[]')

    const introQ = `Please introduce yourself. Tell us your name, background, and what motivates you to pursue a role in ${config.field}.`
    const allQuestions = [introQ, ...questions]
    const total = questions.length

    const [index, setIndex] = useState(0)
    const [answer, setAnswer] = useState('')
    const [qaPairs, setQaPairs] = useState([])
    const [timeLeft, setTimeLeft] = useState((config.maxtime || 20) * 60)
    const [isRecording, setIsRecording] = useState(false)
    const [sttStatus, setSttStatus] = useState('Click to speak your answer')
    const [submitting, setSubmitting] = useState(false)
    const [submitMsg, setSubmitMsg] = useState('Analysing your interview...')

    const videoRef = useRef()
    const recognitionRef = useRef(null)
    const timerRef = useRef()

    useEffect(() => {
        if (!config.field || questions.length === 0) { navigate('/'); return }
        initCamera()
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(timerRef.current); finishInterview([]); return 0 }
                return t - 1
            })
        }, 1000)
        speakQuestion(allQuestions[0])
        return () => {
            clearInterval(timerRef.current)
            window.speechSynthesis.cancel()
            if (videoRef.current?.srcObject)
                videoRef.current.srcObject.getTracks().forEach(t => t.stop())
        }
    }, [])

    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            videoRef.current.srcObject = stream
        } catch (e) { console.warn('Camera unavailable') }
    }

    function speakQuestion(text) {
        window.speechSynthesis.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.rate = 0.95; u.pitch = 1
        const voices = window.speechSynthesis.getVoices()
        const eng = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google'))
            || voices.find(v => v.lang.startsWith('en')) || voices[0]
        if (eng) u.voice = eng
        window.speechSynthesis.speak(u)
    }

    function toggleRecording() {
        if (isRecording) { stopRecording(); return }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SR) { setSttStatus('❌ Browser does not support voice. Please type.'); return }
        const r = new SR()
        r.lang = 'en-US'; r.interimResults = true; r.continuous = false
        r.onstart = () => { setIsRecording(true); setSttStatus('🔴 Listening... speak now') }
        r.onresult = (e) => {
            let interim = '', final = ''
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript
                if (e.results[i].isFinal) final += t; else interim += t
            }
            if (final) {
                setAnswer(prev => (prev + ' ' + final).trim())
                setSttStatus('✅ Got it! Speak more or stop.')
            } else setSttStatus('💬 ' + interim)
        }
        r.onerror = (e) => {
            const msgs = { 'no-speech': '⚠️ No speech. Try again.', 'not-allowed': '❌ Mic denied.', 'network': '❌ Network error.' }
            setSttStatus(msgs[e.error] || '❌ ' + e.error)
            stopRecording()
        }
        r.onend = () => stopRecording()
        recognitionRef.current = r
        r.start()
    }

    function stopRecording() {
        if (recognitionRef.current) { try { recognitionRef.current.stop() } catch (e) { } recognitionRef.current = null }
        setIsRecording(false)
        setSttStatus(prev => prev.includes('✅') ? prev : 'Click to speak your answer')
    }

    function nextQuestion(skip = false) {
        const newPair = { question: allQuestions[index], answer: skip ? '(Skipped)' : (answer || '(No answer given)') }
        const updated = [...qaPairs, newPair]
        setQaPairs(updated)
        setAnswer('')
        setSttStatus('Click to speak your answer')
        if (index >= allQuestions.length - 1) { finishInterview(updated) }
        else { setIndex(i => i + 1); speakQuestion(allQuestions[index + 1]) }
    }

    async function finishInterview(pairs) {
        clearInterval(timerRef.current)
        window.speechSynthesis.cancel()
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop())
        setSubmitting(true)

        const interviewPairs = (pairs.length ? pairs : qaPairs).slice(1)
        let name = 'Candidate', resumeText = ''

        const resumeB64 = sessionStorage.getItem('resumeBase64')
        if (resumeB64) {
            try {
                setSubmitMsg('Parsing resume...')
                const blob = await fetch(resumeB64).then(r => r.blob())
                const fd = new FormData()
                fd.append('resume', blob, sessionStorage.getItem('resumeFileName') || 'resume.pdf')
                const res = await fetch('/api/parse-resume', { method: 'POST', body: fd })
                const data = await res.json()
                if (!data.error) { name = data.name; resumeText = data.raw_text }
            } catch (e) { }
        }

        try {
            setSubmitMsg('AI is evaluating your performance...')
            const res = await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: config.field, level: config.level, qa_pairs: interviewPairs, resume_text: resumeText })
            })
            const result = await res.json()
            result.name = name; result.field = config.field; result.level = config.level; result.totalQuestions = total
            sessionStorage.setItem('interviewResult', JSON.stringify(result))
            // Save full Q&A (including intro) for Result page display
            sessionStorage.setItem('interviewQA', JSON.stringify(pairs.length ? pairs : qaPairs))
            navigate('/result')
        } catch (e) {
            setSubmitting(false)
            alert('Error scoring interview: ' + e.message)
        }
    }

    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
    const secs = String(timeLeft % 60).padStart(2, '0')
    const timerClass = timeLeft < 60 ? s.timerDanger : timeLeft < 180 ? s.timerWarn : s.timer
    const isIntro = index === 0
    const progress = isIntro ? 0 : index
    const progressPct = (progress / total) * 100

    return (
        <div className={s.wrap}>
            {submitting && (
                <div className={s.overlay}>
                    <div className={s.spinner} />
                    <h2>Analysing your Interview...</h2>
                    <p>{submitMsg}</p>
                </div>
            )}

            <div className={s.steps}>
                {[0, 1, 2, 3].map(i => <div key={i} className={`${s.step} ${i < 2 ? s.done : i === 2 ? s.active : ''}`} />)}
            </div>

            <div className={s.layout}>
                {/* LEFT */}
                <div className={s.left}>
                    <div className={s.camBox}>
                        <video ref={videoRef} autoPlay muted playsInline className={s.video} />
                        <div className={s.liveTag}>🔴 Live</div>
                    </div>
                    <div className={s.infoPanel}>
                        <div className={s.infoRow}><span className={s.infoLabel}>Field</span><span className={s.infoVal}>{config.field}</span></div>
                        <div className={s.infoRow}><span className={s.infoLabel}>Level</span><span className={s.infoVal}>{config.level}</span></div>
                        <div className={s.infoRow}><span className={s.infoLabel}>Progress</span><span className={s.infoVal}>{progress} / {total}</span></div>
                        <div className={s.progressBar}><div className={s.progressFill} style={{ width: `${progressPct}%` }} /></div>
                        <div className={timerClass}>{mins}:{secs}</div>
                        <div className={s.timerLabel}>Time Remaining</div>
                    </div>
                </div>

                {/* RIGHT */}
                <div className={s.right}>
                    <div>
                        {isIntro && <div className={s.introBadge}>🎙 INTRODUCTION</div>}
                        <div className={s.qNum}>{isIntro ? 'Introduction' : `Question ${index} / ${total}`}</div>
                        <div className={s.qText}>{allQuestions[index]}</div>
                        <button className={s.speakBtn} onClick={() => speakQuestion(allQuestions[index])}>🔊 Read Again</button>
                    </div>

                    <div className={s.answerSection}>
                        <label className={s.ansLabel}>Your Answer</label>
                        <textarea
                            className={s.textarea}
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            placeholder="Type your answer here, or use the voice button below..."
                        />
                        <div className={s.voiceRow}>
                            <button
                                className={`${s.recordBtn} ${isRecording ? s.recording : ''}`}
                                onClick={toggleRecording}
                            >
                                <span className={s.recDot} />
                                {isRecording ? 'Stop Recording' : 'Record Voice'}
                            </button>
                            <span className={s.sttStatus}>{sttStatus}</span>
                        </div>
                    </div>

                    <div className={s.actionRow}>
                        <button className={s.btnSecondary} onClick={() => nextQuestion(true)}>Skip</button>
                        <button className={s.btnPrimary} onClick={() => nextQuestion(false)}>
                            {index >= allQuestions.length - 1 ? 'Finish Interview ✓' : 'Next Question →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

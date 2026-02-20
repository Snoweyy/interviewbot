import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import s from './Dashboard.module.css'

export default function Dashboard() {
    const navigate = useNavigate()
    const [field, setField] = useState('')
    const [total, setTotal] = useState(5)
    const [maxtime, setMaxtime] = useState(20)
    const [level, setLevel] = useState('')
    const [fileName, setFileName] = useState('')
    const [error, setError] = useState('')
    const fileRef = useRef()

    const handleFile = (f) => {
        if (!f) return
        if (!f.name.endsWith('.pdf')) { setError('Only PDF files are supported.'); return }
        setFileName(f.name)
        const reader = new FileReader()
        reader.onload = (e) => sessionStorage.setItem('resumeBase64', e.target.result)
        reader.readAsDataURL(f)
        sessionStorage.setItem('resumeFileName', f.name)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        handleFile(e.dataTransfer.files[0])
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!field.trim() || !level) { setError('Please fill all required fields.'); return }
        sessionStorage.setItem('interviewConfig', JSON.stringify({ field, total, maxtime, level }))
        navigate('/checkin')
    }

    return (
        <div className={s.wrap}>
            <div className={s.card}>
                <div className={s.logoArea}>
                    <div className={s.logoIcon}>🎯</div>
                    <h1>MockMind AI</h1>
                    <p>Your AI-powered interview coach</p>
                </div>

                {error && <div className={s.alertError}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className={s.formGroup}>
                        <label>Interview Field / Role *</label>
                        <input
                            value={field}
                            onChange={e => setField(e.target.value)}
                            placeholder="e.g. Python Developer, Data Science, HR Manager"
                            required
                        />
                    </div>

                    <div className={s.row2}>
                        <div className={s.formGroup}>
                            <label>Total Questions *</label>
                            <input type="number" min={3} max={20} value={total}
                                onChange={e => setTotal(e.target.value)} required />
                        </div>
                        <div className={s.formGroup}>
                            <label>Max Time (minutes) *</label>
                            <input type="number" min={5} max={120} value={maxtime}
                                onChange={e => setMaxtime(e.target.value)} required />
                        </div>
                    </div>

                    <div className={s.formGroup}>
                        <label>Interview Level *</label>
                        <select value={level} onChange={e => setLevel(e.target.value)} required>
                            <option value="">— Select Level —</option>
                            <option value="Beginner">🟢 Beginner</option>
                            <option value="Intermediate">🟡 Intermediate</option>
                            <option value="Advanced">🔴 Advanced</option>
                        </select>
                    </div>

                    <div className={s.formGroup}>
                        <label>Upload Resume (PDF)</label>
                        <div
                            className={s.uploadArea}
                            onDragOver={e => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current.click()}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf"
                                style={{ display: 'none' }}
                                onChange={e => handleFile(e.target.files[0])}
                            />
                            <div className={s.uploadIcon}>📄</div>
                            <p>Click to upload or drag & drop your resume</p>
                            <p className={s.uploadSub}>PDF only</p>
                            {fileName && <div className={s.fileName}>✅ {fileName}</div>}
                        </div>
                    </div>

                    <button type="submit" className={s.btnPrimary}>
                        Start Interview Setup →
                    </button>
                </form>
            </div>
        </div>
    )
}

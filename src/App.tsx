import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import InterviewRoom from './pages/InterviewRoom'
import Results from './pages/Results'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/interview" element={<InterviewRoom />} />
        <Route path="/results" element={<Results />} />
      </Routes>
    </Router>
  )
}

export default App
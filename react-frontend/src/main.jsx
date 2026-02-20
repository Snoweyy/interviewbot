import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Dashboard from './pages/Dashboard'
import Checkin from './pages/Checkin'
import Interview from './pages/Interview'
import Result from './pages/Result'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/checkin" element={<Checkin />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/result" element={<Result />} />
    </Routes>
  </BrowserRouter>
)

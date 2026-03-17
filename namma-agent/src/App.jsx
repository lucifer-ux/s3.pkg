import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import AIShopper from './AIShopper'
import EarphoneTest from './EarphoneTest'
import './App.css'

function Home() {
  return (
    <div style={{ position: 'relative' }}>
      <AIShopper />
      <Link
        to="/test"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          zIndex: 100,
        }}
      >
        🎧 Test Earphone
      </Link>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/test" element={<EarphoneTest />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

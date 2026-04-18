import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [backendStatus, setBackendStatus] = useState('checking...')

  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => res.json())
      .then(data => setBackendStatus(data.status))
      .catch(() => setBackendStatus('offline'))
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>Celebration Demand Intelligence</h1>
        <p>AI-powered demand forecasting for SMEs</p>
      </header>

      <main className="main">
        <div className="status-card">
          <h2>System Status</h2>
          <p>Backend: <span className={backendStatus === 'ok' ? 'online' : 'offline'}>
            {backendStatus}
          </span></p>
        </div>

        <div className="demo-section">
          <h2>Demo: Try the API</h2>
          <button onClick={testApi}>Test Prediction</button>
        </div>
      </main>
    </div>
  )
}

function testApi() {
  fetch('http://localhost:5000/api/glm/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Hello, what can you do?' })
  })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err))
}

export default App
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FRAME_WIDTH, FRAME_HEIGHT } from './utils/scale'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      overflow: 'hidden', // ensure bottom corners clip
      margin: '0 auto',
      position: 'relative',
      background: '#fff',
      borderRadius: 16,
    }}>
      <App />
    </div>
  </StrictMode>,
)

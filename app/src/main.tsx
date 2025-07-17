import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className='flex flex-col items-center mb-4'>
      <a href="https://remc1.net" target="_blank" rel="noopener noreferrer">
        <img src="/src/assets/REMC1.png" alt="REMC1 Logo. Click to go to REMC1.net" />
      </a>
      </div>
      <App />

  </StrictMode>,
)

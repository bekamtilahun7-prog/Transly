import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AccessibilityProvider } from './context/AccessibilityContext'
import { AccessibilityChrome } from './components/accessibility/AccessibilityChrome'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <AccessibilityChrome />
          <App />
        </AccessibilityProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>,
)

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AccessibilityProvider } from './context/AccessibilityContext'
import { AccessibilityChrome } from './components/accessibility/AccessibilityChrome'
import { AuthProvider } from './context/AuthContext'
import { LocaleProvider } from './context/LocaleContext'
import { ThemeProvider } from './context/ThemeContext'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <AccessibilityProvider>
            <AccessibilityChrome />
            <App />
          </AccessibilityProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  </BrowserRouter>,
)

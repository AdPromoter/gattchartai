import { useEffect, useRef, useState } from 'react'
import {
  loadGoogleScript,
  initializeGoogleSignIn,
  renderGoogleButton,
  promptOneTap,
  decodeJwtResponse,
  saveUserSession
} from '../services/authService'
import './Login.css'

function Login({ onLogin, clientId }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!clientId) {
      setError('Google Client ID not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.')
      setIsLoading(false)
      return
    }

    const initGoogleSignIn = async () => {
      try {
        // Load Google Identity Services script
        await loadGoogleScript()

        // Initialize Google Sign-In
        await initializeGoogleSignIn(clientId, handleCredentialResponse)

        // Render sign-in button
        if (buttonRef.current) {
          renderGoogleButton('google-signin-button', {
            width: 280
          })
        }

        // Show One Tap prompt after a short delay
        setTimeout(() => {
          promptOneTap()
        }, 500)

        setIsLoading(false)
      } catch (err) {
        console.error('Error initializing Google Sign-In:', err)
        setError('Failed to load Google Sign-In. Please refresh the page.')
        setIsLoading(false)
      }
    }

    initGoogleSignIn()
  }, [clientId])

  const handleCredentialResponse = (response) => {
    try {
      const user = decodeJwtResponse(response.credential)
      
      if (user) {
        // Save user session
        saveUserSession(user)
        
        // Notify parent component
        onLogin(user)
      } else {
        setError('Failed to decode user information. Please try again.')
      }
    } catch (err) {
      console.error('Error handling credential response:', err)
      setError('Authentication failed. Please try again.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>AI Gantt Chart</h1>
          <p>Sign in with Google to access your projects</p>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="login-loading">
            <div className="spinner"></div>
            <p>Loading Google Sign-In...</p>
          </div>
        ) : (
          <div className="login-content">
            <div id="google-signin-button" ref={buttonRef}></div>
            <p className="login-note">
              By signing in, you'll be able to save and access your projects across devices.
              <br />
              New users will automatically create an account.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Login


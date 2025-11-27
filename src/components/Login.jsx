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

const handleGuestLogin = (onLogin) => {
  const guestUser = {
    sub: 'guest-' + Date.now(),
    email: 'guest@local',
    name: 'Guest User',
    picture: ''
  }
  saveUserSession(guestUser)
  onLogin(guestUser)
}

function Login({ onLogin, clientId }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!clientId) {
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
          {clientId ? (
            <p>Sign in with Google to access your projects</p>
          ) : (
            <p>Continue to access your projects</p>
          )}
        </div>

        {error && clientId && (
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
            {clientId && (
              <div id="google-signin-button" ref={buttonRef}></div>
            )}
            {!clientId && (
              <div className="login-no-google">
                <p className="login-note">
                  Google Sign-In is not configured. You can continue with local storage.
                </p>
                <button 
                  className="cta-primary" 
                  onClick={() => {
                    // Create a local guest user
                    const guestUser = {
                      sub: 'guest-' + Date.now(),
                      email: 'guest@local',
                      name: 'Guest User',
                      picture: ''
                    }
                    saveUserSession(guestUser)
                    onLogin(guestUser)
                  }}
                >
                  Continue as Guest
                </button>
              </div>
            )}
            {clientId && (
              <p className="login-note">
                By signing in, you'll be able to save and access your projects across devices.
                <br />
                New users will automatically create an account.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Login


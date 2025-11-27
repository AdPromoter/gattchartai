// Google OAuth Authentication Service

let googleScriptLoaded = false

// Load Google Identity Services script
export function loadGoogleScript() {
  if (googleScriptLoaded || document.getElementById('google-signin-script')) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = 'google-signin-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      googleScriptLoaded = true
      resolve()
    }
    script.onerror = () => {
      reject(new Error('Failed to load Google Sign-In script'))
    }
    document.head.appendChild(script)
  })
}

// Initialize Google Sign-In
export function initializeGoogleSignIn(clientId, callback) {
  if (typeof window.google === 'undefined') {
    return Promise.reject(new Error('Google Identity Services not loaded'))
  }

  return new Promise((resolve) => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: callback,
      auto_select: false,
      cancel_on_tap_outside: true
    })
    resolve()
  })
}

// Render Google Sign-In button
export function renderGoogleButton(elementId, options = {}) {
  if (typeof window.google === 'undefined') {
    console.error('Google Identity Services not loaded')
    return
  }

  window.google.accounts.id.renderButton(
    document.getElementById(elementId),
    {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      width: 250,
      ...options
    }
  )
}

// Prompt One Tap sign-in
export function promptOneTap() {
  if (typeof window.google === 'undefined') {
    return
  }

  window.google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
      // One Tap not displayed - user can use button instead
    }
  })
}

// Decode JWT token from Google
export function decodeJwtResponse(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding JWT:', error)
    return null
  }
}

// Store user session
export function saveUserSession(user) {
  try {
    localStorage.setItem('gantt-user', JSON.stringify({
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      loginTime: new Date().toISOString()
    }))
    return true
  } catch (error) {
    console.error('Error saving user session:', error)
    return false
  }
}

// Get current user session
export function getUserSession() {
  try {
    const userStr = localStorage.getItem('gantt-user')
    if (userStr) {
      return JSON.parse(userStr)
    }
    return null
  } catch (error) {
    console.error('Error getting user session:', error)
    return null
  }
}

// Clear user session
export function clearUserSession() {
  try {
    localStorage.removeItem('gantt-user')
    return true
  } catch (error) {
    console.error('Error clearing user session:', error)
    return false
  }
}

// Sign out
export function signOut() {
  if (typeof window.google !== 'undefined' && window.google.accounts) {
    window.google.accounts.id.disableAutoSelect()
  }
  clearUserSession()
}


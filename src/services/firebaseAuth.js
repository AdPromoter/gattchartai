// Firebase Authentication Service with Google Sign-In
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth } from '../config/firebase'

const googleProvider = new GoogleAuthProvider()

// Sign in with Google
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    
    return {
      id: user.uid,
      email: user.email,
      name: user.displayName,
      picture: user.photoURL
    }
  } catch (error) {
    console.error('Error signing in with Google:', error)
    throw error
  }
}

// Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth)
    return true
  } catch (error) {
    console.error('Error signing out:', error)
    return false
  }
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser
}

// Listen to auth state changes
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        id: user.uid,
        email: user.email,
        name: user.displayName,
        picture: user.photoURL
      })
    } else {
      callback(null)
    }
  })
}

// Convert Firebase user to app user format
export function formatUser(user) {
  if (!user) return null
  
  return {
    id: user.uid,
    email: user.email,
    name: user.displayName,
    picture: user.photoURL
  }
}



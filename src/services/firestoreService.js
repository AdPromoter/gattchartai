// Firestore service for saving and loading Gantt Chart data
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../config/firebase'

// Get user data document reference
function getUserDataRef(userId) {
  return doc(db, 'users', userId)
}

// Save user's Gantt chart data to Firestore
export async function saveToFirestore(data, userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required to save data')
    }

    const userDataRef = getUserDataRef(userId)
    const dataToSave = {
      sheets: data.sheets || [],
      activeSheetId: data.activeSheetId || null,
      visibleColumns: data.visibleColumns || null,
      updatedAt: serverTimestamp(),
      savedAt: new Date().toISOString()
    }

    await setDoc(userDataRef, dataToSave, { merge: true })
    return true
  } catch (error) {
    console.error('Error saving to Firestore:', error)
    throw error
  }
}

// Load user's Gantt chart data from Firestore
export async function loadFromFirestore(userId) {
  try {
    if (!userId) {
      return null
    }

    const userDataRef = getUserDataRef(userId)
    const docSnap = await getDoc(userDataRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        sheets: data.sheets || [],
        activeSheetId: data.activeSheetId || null,
        visibleColumns: data.visibleColumns || null,
        savedAt: data.savedAt || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null
      }
    }
    
    return null
  } catch (error) {
    console.error('Error loading from Firestore:', error)
    return null
  }
}

// Update specific fields in user data
export async function updateFirestoreData(userId, updates) {
  try {
    if (!userId) {
      throw new Error('User ID is required to update data')
    }

    const userDataRef = getUserDataRef(userId)
    await updateDoc(userDataRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
    
    return true
  } catch (error) {
    console.error('Error updating Firestore data:', error)
    throw error
  }
}



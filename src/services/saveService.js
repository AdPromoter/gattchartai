// Save/load service for Gantt Chart data

function getStorageKey(userId) {
  return userId ? `gantt-chart-data-${userId}` : 'gantt-chart-data'
}

export function saveToLocalStorage(data, userId = null) {
  try {
    const storageKey = getStorageKey(userId)
    const dataToSave = {
      sheets: data.sheets,
      activeSheetId: data.activeSheetId,
      visibleColumns: data.visibleColumns,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem(storageKey, JSON.stringify(dataToSave))
    return true
  } catch (error) {
    console.error('Error saving to localStorage:', error)
    return false
  }
}

export function loadFromLocalStorage(userId = null) {
  try {
    const storageKey = getStorageKey(userId)
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const data = JSON.parse(saved)
      return {
        sheets: data.sheets || [],
        activeSheetId: data.activeSheetId || null,
        visibleColumns: data.visibleColumns || null,
        savedAt: data.savedAt || null
      }
    }
    return null
  } catch (error) {
    console.error('Error loading from localStorage:', error)
    return null
  }
}

export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.error('Error clearing localStorage:', error)
    return false
  }
}

export function exportToJSON(data, filename = 'gantt-chart.json') {
  try {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      sheets: data.sheets,
      visibleColumns: data.visibleColumns
    }
    
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('Error exporting to JSON:', error)
    return false
  }
}

export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        
        // Validate structure
        if (!data.sheets || !Array.isArray(data.sheets)) {
          reject(new Error('Invalid file format: missing sheets array'))
          return
        }
        
        resolve({
          sheets: data.sheets,
          activeSheetId: data.sheets[0]?.id || null,
          visibleColumns: data.visibleColumns || null
        })
      } catch (error) {
        reject(new Error(`Invalid JSON file: ${error.message}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Error reading file'))
    }
    
    reader.readAsText(file)
  })
}


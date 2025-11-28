import { useState, useCallback, useEffect, useRef } from 'react'
import { format, startOfToday, addDays } from 'date-fns'
import GanttChart from './components/GanttChart'
import AIAssistant from './components/AIAssistant'
import SheetTabs from './components/SheetTabs'
import Login from './components/Login'
import LandingPage from './components/LandingPage'
import { parseAITask } from './services/aiService'
import { saveToLocalStorage, loadFromLocalStorage, exportToJSON, importFromJSON } from './services/saveService'
import { getUserSession, signOut, saveUserSession } from './services/authService'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showLanding, setShowLanding] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  // Check for existing user session on mount
  useEffect(() => {
    const session = getUserSession()
    if (session) {
      setUser(session)
      setShowLanding(false) // Hide landing if user session exists
    } else if (!googleClientId) {
      // Auto-create guest user if no Google Client ID is configured
      const guestUser = {
        id: 'guest-' + Date.now(),
        email: 'guest@local',
        name: 'Guest User',
        picture: ''
      }
      saveUserSession(guestUser)
      setUser(guestUser)
      setShowLanding(false)
    }
    setIsInitialized(true)
  }, [googleClientId])

  // Load from localStorage on mount (after user is set)
  const [sheets, setSheets] = useState(() => {
    const session = getUserSession()
    const saved = loadFromLocalStorage(session?.id)
    if (saved && saved.sheets && saved.sheets.length > 0) {
      return saved.sheets
    }
    return [{
      id: 'sheet-1',
      name: 'Main Project',
      tasks: [],
      customColumns: []
    }]
  })
  
  const [activeSheetId, setActiveSheetId] = useState(() => {
    const session = getUserSession()
    const saved = loadFromLocalStorage(session?.id)
    if (saved && saved.activeSheetId) {
      return saved.activeSheetId
    }
    return 'sheet-1'
  })
  
  // Track if we've loaded initial data to avoid saving during initial load
  const isInitialMount = useRef(true)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const session = getUserSession()
    const saved = loadFromLocalStorage(session?.id)
    return saved?.visibleColumns || {
      task: true,
      today: true,
      startDate: true,
      duration: true,
      endDate: true,
      owner: true,
      timeline: true
    }
  })
  
  // Auto-save to localStorage whenever data changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    
    // Save to localStorage (works for both logged in and guest users)
    const userId = user?.id || 'guest'
    
    // Debounce saves to avoid excessive localStorage writes
    const timeoutId = setTimeout(() => {
      saveToLocalStorage({
        sheets,
        activeSheetId,
        visibleColumns
      }, userId)
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [sheets, activeSheetId, visibleColumns, user])
  
  // Reload data when user logs in
  useEffect(() => {
    if (user) {
      const saved = loadFromLocalStorage(user.id)
      if (saved) {
        if (saved.sheets && saved.sheets.length > 0) {
          setSheets(saved.sheets)
        }
        if (saved.activeSheetId) {
          setActiveSheetId(saved.activeSheetId)
        }
        if (saved.visibleColumns) {
          setVisibleColumns(saved.visibleColumns)
        }
      }
      isInitialMount.current = true
    }
  }, [user])

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0]
  const tasks = activeSheet?.tasks || []

  const handleAIInput = useCallback(async (input, inputType = 'text') => {
    setIsProcessing(true)
    try {
      // Pass full context to AI service
      const context = {
        sheets,
        activeSheetId,
        activeSheetTasks: tasks,
        customColumns: activeSheet.customColumns || []
      }
      
      const parsedTask = await parseAITask(input, context)
      
      if (parsedTask) {
        if (parsedTask.action === 'add') {
          // Add task to the specified sheet or current sheet
          const targetSheetId = parsedTask.sheetId || activeSheetId
          setSheets(prev => prev.map(sheet =>
            sheet.id === targetSheetId
              ? { ...sheet, tasks: [...sheet.tasks, parsedTask.task] }
              : sheet
          ))
        } else if (parsedTask.action === 'update') {
          // Update task in the specified sheet or current sheet
          const targetSheetId = parsedTask.sheetId || activeSheetId
          setSheets(prev => prev.map(sheet =>
            sheet.id === targetSheetId
              ? { ...sheet, tasks: sheet.tasks.map(t => 
                  t.id === parsedTask.taskId 
                    ? { ...t, ...parsedTask.updates }
                    : t
                )}
              : sheet
          ))
        } else if (parsedTask.action === 'delete') {
          // Delete task from the specified sheet or current sheet
          const targetSheetId = parsedTask.sheetId || activeSheetId
          setSheets(prev => prev.map(sheet =>
            sheet.id === targetSheetId
              ? { ...sheet, tasks: sheet.tasks.filter(t => t.id !== parsedTask.taskId) }
              : sheet
          ))
        } else if (parsedTask.action === 'create-sheet') {
          setSheets(prev => [...prev, parsedTask.sheet])
          setActiveSheetId(parsedTask.sheet.id)
        } else if (parsedTask.action === 'rename-sheet') {
          setSheets(prev => prev.map(sheet =>
            sheet.id === parsedTask.sheetId
              ? { ...sheet, name: parsedTask.sheetName }
              : sheet
          ))
        } else if (parsedTask.action === 'switch-sheet') {
          setActiveSheetId(parsedTask.sheetId)
        } else if (parsedTask.action === 'delete-sheet') {
          if (sheets.length === 1) {
            alert('Cannot delete the last sheet. Create a new one first.')
            return
          }
          setSheets(prev => {
            const filtered = prev.filter(s => s.id !== parsedTask.sheetId)
            if (activeSheetId === parsedTask.sheetId && filtered.length > 0) {
              setActiveSheetId(filtered[0].id)
            }
            return filtered
          })
        } else if (parsedTask.action === 'add-column') {
          const newColumn = {
            id: `col-${Date.now()}`,
            name: parsedTask.columnName,
            visible: true
          }
          setSheets(prev => prev.map(sheet =>
            sheet.id === activeSheetId
              ? { 
                  ...sheet, 
                  customColumns: [...(sheet.customColumns || []), newColumn]
                }
              : sheet
          ))
        } else if (parsedTask.action === 'delete-column') {
          setSheets(prev => prev.map(sheet =>
            sheet.id === activeSheetId
              ? { 
                  ...sheet, 
                  customColumns: (sheet.customColumns || []).filter(col => col.id !== parsedTask.columnId)
                }
              : sheet
          ))
        }
      }
    } catch (error) {
      console.error('AI processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [tasks, activeSheetId, sheets, activeSheet])

  const handleAddSheet = useCallback(() => {
    const newSheet = {
      id: `sheet-${Date.now()}`,
      name: `Sheet ${sheets.length + 1}`,
      tasks: [],
      customColumns: []
    }
    setSheets(prev => [...prev, newSheet])
    setActiveSheetId(newSheet.id)
  }, [sheets.length])

  const handleRenameSheet = useCallback((sheetId, newName) => {
    setSheets(prev => prev.map(sheet =>
      sheet.id === sheetId ? { ...sheet, name: newName } : sheet
    ))
  }, [])

  const handleDeleteSheet = useCallback((sheetId) => {
    if (sheets.length === 1) {
      alert('Cannot delete the last sheet. Create a new one first.')
      return
    }
    setSheets(prev => {
      const filtered = prev.filter(s => s.id !== sheetId)
      if (activeSheetId === sheetId && filtered.length > 0) {
        setActiveSheetId(filtered[0].id)
      }
      return filtered
    })
  }, [sheets.length, activeSheetId])

  const handleUpdateTask = useCallback((taskId, updates) => {
    if (taskId === 'new') {
      // Adding a new task
      setSheets(prev => prev.map(sheet =>
        sheet.id === activeSheetId
          ? { ...sheet, tasks: [...sheet.tasks, updates] }
          : sheet
      ))
    } else {
      // Updating existing task
      setSheets(prev => prev.map(sheet =>
        sheet.id === activeSheetId
          ? { ...sheet, tasks: sheet.tasks.map(t => 
              t.id === taskId ? { ...t, ...updates } : t
            )}
          : sheet
      ))
    }
  }, [activeSheetId])

  const handleAddTask = useCallback(() => {
    const newTask = {
      id: `task-${Date.now()}`,
      name: '',
      startDate: format(startOfToday(), 'yyyy-MM-dd'),
      endDate: format(addDays(startOfToday(), 7), 'yyyy-MM-dd'),
      status: 'planned',
      progress: 0,
      owner: ''
    }
    setSheets(prev => prev.map(sheet =>
      sheet.id === activeSheetId
        ? { ...sheet, tasks: [...sheet.tasks, newTask] }
        : sheet
    ))
    // Return task ID so component can scroll to it
    return newTask.id
  }, [activeSheetId])

  const handleInsertRow = useCallback((position, insertIndex) => {
    // Create completely empty task
    const newTask = {
      id: `task-${Date.now()}`,
      name: '',
      startDate: '',
      endDate: '',
      status: 'planned',
      progress: 0,
      owner: ''
    }
    
    setSheets(prev => prev.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newTasks = [...sheet.tasks]
        // Clamp insertIndex to valid range (0 to tasks.length)
        const maxIndex = newTasks.length
        const clampedIndex = Math.min(Math.max(0, insertIndex), maxIndex)
        const insertPos = position === 'above' ? clampedIndex : Math.min(clampedIndex + 1, maxIndex)
        newTasks.splice(insertPos, 0, newTask)
        return { ...sheet, tasks: newTasks }
      }
      return sheet
    }))
    return newTask.id
  }, [activeSheetId])

  const handleInsertColumn = useCallback((position, insertIndex) => {
    const columnName = prompt('Enter column name:')
    if (!columnName || !columnName.trim()) return
    
    const newColumn = {
      id: `col-${Date.now()}`,
      name: columnName.trim(),
      visible: true
    }
    
    setSheets(prev => prev.map(sheet => {
      if (sheet.id === activeSheetId) {
        const customCols = [...(sheet.customColumns || [])]
        // insertIndex is the column position in the visible columns list
        // Standard columns: task, startDate, duration, endDate, owner (5 max)
        // Custom columns appear after all standard columns (before timeline)
        
        // Count how many standard columns exist before the insert position
        let standardColCount = 0
        const standardOrder = ['task', 'startDate', 'duration', 'endDate', 'owner']
        standardOrder.forEach(col => {
          if (visibleColumns[col]) standardColCount++
        })
        
        // Calculate position in customColumns array
        // If inserting at or after all standard columns, insert in custom columns array
        let customColInsertIndex = Math.max(0, insertIndex - standardColCount)
        if (position === 'right') {
          customColInsertIndex++
        }
        
        customCols.splice(customColInsertIndex, 0, newColumn)
        return { ...sheet, customColumns: customCols }
      }
      return sheet
    }))
  }, [activeSheetId, visibleColumns])

  const handleAddColumn = useCallback(() => {
    const columnName = prompt('Enter column name:')
    if (!columnName || !columnName.trim()) return
    
    const newColumn = {
      id: `col-${Date.now()}`,
      name: columnName.trim(),
      visible: true
    }
    
    setSheets(prev => prev.map(sheet =>
      sheet.id === activeSheetId
        ? { 
            ...sheet, 
            customColumns: [...(sheet.customColumns || []), newColumn]
          }
        : sheet
    ))
  }, [activeSheetId])

  const handleDeleteColumn = useCallback((columnId) => {
    setSheets(prev => prev.map(sheet =>
      sheet.id === activeSheetId
        ? { 
            ...sheet, 
            customColumns: (sheet.customColumns || []).filter(col => col.id !== columnId)
          }
        : sheet
    ))
  }, [activeSheetId])

  const handleExport = useCallback(() => {
    const success = exportToJSON({
      sheets,
      visibleColumns
    }, `gantt-chart-${new Date().toISOString().split('T')[0]}.json`)
    
    if (success) {
      alert('Project exported successfully!')
    } else {
      alert('Error exporting project. Please try again.')
    }
  }, [sheets, visibleColumns])

  const handleImport = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      
      try {
        const imported = await importFromJSON(file)
        
        if (window.confirm('Import will replace your current project. Continue?')) {
          setSheets(imported.sheets)
          if (imported.activeSheetId) {
            setActiveSheetId(imported.activeSheetId)
          }
          if (imported.visibleColumns) {
            setVisibleColumns(imported.visibleColumns)
          }
          // Save immediately after import
          saveToLocalStorage({
            sheets: imported.sheets,
            activeSheetId: imported.activeSheetId || imported.sheets[0]?.id,
            visibleColumns: imported.visibleColumns || visibleColumns
          })
          alert('Project imported successfully!')
        }
      } catch (error) {
        alert(`Error importing file: ${error.message}`)
      }
    }
    input.click()
  }, [visibleColumns])

  const handleLogin = useCallback((userData) => {
    setUser({
      id: userData.sub,
      email: userData.email,
      name: userData.name,
      picture: userData.picture
    })
  }, [])

  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to sign out?')) {
      signOut()
      setUser(null)
      // Reset to default state
      setSheets([{
        id: 'sheet-1',
        name: 'Main Project',
        tasks: [],
        customColumns: []
      }])
      setActiveSheetId('sheet-1')
    }
  }, [])

  // Don't render until initialized
  if (!isInitialized) {
    return null
  }

  // Show landing page first if not logged in
  if (!user && showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />
  }

  // Auto-create guest user if no Google Client ID and user clicked "Sign In"
  useEffect(() => {
    if (!user && !showLanding && !googleClientId && isInitialized) {
      const guestUser = {
        id: 'guest-' + Date.now(),
        email: 'guest@local',
        name: 'Guest User',
        picture: ''
      }
      saveUserSession(guestUser)
      setUser(guestUser)
    }
  }, [user, showLanding, googleClientId, isInitialized])

  // Show login screen if not authenticated (after landing page)
  if (!user && !showLanding && googleClientId) {
    return <Login onLogin={handleLogin} clientId={googleClientId} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>AI Gantt Chart</h1>
            <div className="user-info">
              {user.picture && (
                <img src={user.picture} alt={user.name} className="user-avatar" />
              )}
              <span className="user-name">{user.name}</span>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="header-btn" 
              onClick={handleExport}
              title="Export project to JSON file"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export
            </button>
            <button 
              className="header-btn" 
              onClick={handleImport}
              title="Import project from JSON file"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Import
            </button>
          </div>
        </div>
        <div className="save-indicator">
          <span className="save-text">Auto-saved to browser • {user?.email || ''}</span>
        </div>
      </header>
      
      <div className="app-content">
        <GanttChart 
          tasks={tasks} 
          visibleColumns={visibleColumns}
          customColumns={activeSheet.customColumns || []}
          onToggleColumn={(column) => setVisibleColumns(prev => ({
            ...prev,
            [column]: !prev[column]
          }))}
          onUpdateTask={handleUpdateTask}
          onAddRow={handleAddTask}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
          onInsertRow={handleInsertRow}
          onInsertColumn={handleInsertColumn}
        />
      </div>

      <SheetTabs
        sheets={sheets}
        activeSheetId={activeSheetId}
        onSelectSheet={setActiveSheetId}
        onAddSheet={handleAddSheet}
        onRenameSheet={handleRenameSheet}
        onDeleteSheet={handleDeleteSheet}
      />

      <AIAssistant 
        onInput={handleAIInput}
        isProcessing={isProcessing}
        activeSheetName={activeSheet.name}
      />
    </div>
  )
}

export default App

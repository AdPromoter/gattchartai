import { useState, useCallback, useEffect, useRef } from 'react'
import { format, startOfToday, addDays } from 'date-fns'
import GanttChart from './components/GanttChart'
import AIAssistant from './components/AIAssistant'
import SheetTabs from './components/SheetTabs'
import Login from './components/Login'
import LandingPage from './components/LandingPage'
import FileMenu from './components/FileMenu'
import { parseAITask } from './services/aiService'
import { exportToJSON, importFromJSON } from './services/saveService'
import { signOut as firebaseSignOut, onAuthStateChange } from './services/firebaseAuth'
import { saveToFirestore, loadFromFirestore } from './services/firestoreService'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showLanding, setShowLanding] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((authUser) => {
      setUser(authUser)
      setIsInitialized(true)
      
      if (authUser) {
        setShowLanding(false)
      }
    })

    return () => unsubscribe()
  }, [])

  // Initialize state with default values
  const [sheets, setSheets] = useState([{
    id: 'sheet-1',
    name: 'Main Project',
    tasks: [],
    customColumns: []
  }])
  
  const [activeSheetId, setActiveSheetId] = useState('sheet-1')
  
  // Track if we've loaded initial data to avoid saving during initial load
  const isInitialMount = useRef(true)
  const isDataLoaded = useRef(false)
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    task: true,
    today: true,
    startDate: true,
    duration: true,
    endDate: true,
    owner: true,
    timeline: true
  })
  
  // Load data from Firestore when user logs in
  useEffect(() => {
    if (user && !isDataLoaded.current) {
      setIsLoadingData(true)
      loadFromFirestore(user.id)
        .then((saved) => {
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
          isDataLoaded.current = true
          isInitialMount.current = true
          setIsLoadingData(false)
        })
        .catch((error) => {
          console.error('Error loading data from Firestore:', error)
          isDataLoaded.current = true
          isInitialMount.current = true
          setIsLoadingData(false)
        })
    } else if (!user) {
      // Reset when user logs out
      isDataLoaded.current = false
      setSheets([{
        id: 'sheet-1',
        name: 'Main Project',
        tasks: [],
        customColumns: []
      }])
      setActiveSheetId('sheet-1')
    }
  }, [user])
  
  // Auto-save to Firestore whenever data changes
  useEffect(() => {
    if (isInitialMount.current || !user || !isDataLoaded.current) {
      if (isInitialMount.current) {
        isInitialMount.current = false
      }
      return
    }
    
    // Debounce saves to avoid excessive Firestore writes
    const timeoutId = setTimeout(async () => {
      try {
        await saveToFirestore({
          sheets,
          activeSheetId,
          visibleColumns
        }, user.id)
      } catch (error) {
        console.error('Error saving to Firestore:', error)
      }
    }, 1000) // 1 second debounce for Firestore
    
    return () => clearTimeout(timeoutId)
  }, [sheets, activeSheetId, visibleColumns, user])

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

  const handleSave = useCallback(async () => {
    if (!user) {
      alert('Please sign in to save your project.')
      return
    }
    
    try {
      await saveToFirestore({
        sheets,
        activeSheetId,
        visibleColumns
      }, user.id)
      return true
    } catch (error) {
      console.error('Error saving:', error)
      alert('Error saving project. Please try again.')
      return false
    }
  }, [sheets, activeSheetId, visibleColumns, user])

  const handleOpen = useCallback(() => {
    // Open is the same as Import - opens a file picker
    handleImport()
  }, [handleImport])

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
          if (user) {
            saveToFirestore({
              sheets: imported.sheets,
              activeSheetId: imported.activeSheetId || imported.sheets[0]?.id,
              visibleColumns: imported.visibleColumns || visibleColumns
            }, user.id).catch(error => {
              console.error('Error saving imported data:', error)
            })
          }
          alert('Project imported successfully!')
        }
      } catch (error) {
        alert(`Error importing file: ${error.message}`)
      }
    }
    input.click()
  }, [visibleColumns])

  const handleLogin = useCallback((userData) => {
    // User is set via onAuthStateChange, no need to set it here
    // But we can trigger data load if needed
    isDataLoaded.current = false
  }, [])

  const handleLogout = useCallback(async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await firebaseSignOut()
      setUser(null)
      setShowLanding(true)
      // Reset to default state
      setSheets([{
        id: 'sheet-1',
        name: 'Main Project',
        tasks: [],
        customColumns: []
      }])
      setActiveSheetId('sheet-1')
      isDataLoaded.current = false
    }
  }, [])

  // Keyboard shortcuts for File menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+S or Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      // Ctrl+O or Cmd+O - Open
      else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        handleOpen()
      }
      // Ctrl+E or Cmd+E - Export
      else if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault()
        handleExport()
      }
      // Ctrl+I or Cmd+I - Import
      else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault()
        handleImport()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, handleOpen, handleExport, handleImport])

  // Don't render until initialized
  if (!isInitialized) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Show landing page first if not logged in
  if (!user && showLanding) {
    return <LandingPage onGetStarted={() => setShowLanding(false)} />
  }

  // Show login screen if not authenticated (after landing page)
  if (!user && !showLanding) {
    return <Login onLogin={handleLogin} />
  }

  // Show loading state while loading user data
  if (isLoadingData) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading your projects...</p>
      </div>
    )
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
            <FileMenu
              onSave={handleSave}
              onOpen={handleOpen}
              onExport={handleExport}
              onImport={handleImport}
            />
          </div>
        </div>
        <div className="save-indicator">
          <span className="save-text">Auto-saved to cloud • {user?.email || ''}</span>
          <button 
            className="header-btn logout-btn" 
            onClick={handleLogout}
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Sign Out
          </button>
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

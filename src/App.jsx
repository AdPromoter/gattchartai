import { useState, useCallback } from 'react'
import { format, startOfToday, addDays } from 'date-fns'
import GanttChart from './components/GanttChart'
import AIAssistant from './components/AIAssistant'
import SheetTabs from './components/SheetTabs'
import { parseAITask } from './services/aiService'
import './App.css'

function App() {
  const [sheets, setSheets] = useState([
    {
      id: 'sheet-1',
      name: 'Main Project',
      tasks: [],
      customColumns: []
    }
  ])
  const [activeSheetId, setActiveSheetId] = useState('sheet-1')
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

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0]
  const tasks = activeSheet?.tasks || []

  const handleAIInput = useCallback(async (input, inputType = 'text') => {
    setIsProcessing(true)
    try {
      const parsedTask = await parseAITask(input, tasks)
      
      if (parsedTask) {
        if (parsedTask.action === 'add') {
          setSheets(prev => prev.map(sheet =>
            sheet.id === activeSheetId
              ? { ...sheet, tasks: [...sheet.tasks, parsedTask.task] }
              : sheet
          ))
        } else if (parsedTask.action === 'update') {
          setSheets(prev => prev.map(sheet =>
            sheet.id === activeSheetId
              ? { ...sheet, tasks: sheet.tasks.map(t => 
                  t.id === parsedTask.taskId 
                    ? { ...t, ...parsedTask.updates }
                    : t
                )}
              : sheet
          ))
        } else if (parsedTask.action === 'delete') {
          setSheets(prev => prev.map(sheet =>
            sheet.id === activeSheetId
              ? { ...sheet, tasks: sheet.tasks.filter(t => t.id !== parsedTask.taskId) }
              : sheet
          ))
        } else if (parsedTask.action === 'create-sheet') {
          setSheets(prev => [...prev, parsedTask.sheet])
          setActiveSheetId(parsedTask.sheet.id)
        }
      }
    } catch (error) {
      console.error('AI processing error:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [tasks, activeSheetId])

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
    const newTask = {
      id: `task-${Date.now()}`,
      name: '',
      startDate: format(startOfToday(), 'yyyy-MM-dd'),
      endDate: format(addDays(startOfToday(), 7), 'yyyy-MM-dd'),
      status: 'planned',
      progress: 0,
      owner: ''
    }
    
    setSheets(prev => prev.map(sheet => {
      if (sheet.id === activeSheetId) {
        const newTasks = [...sheet.tasks]
        const insertPos = position === 'above' ? insertIndex : insertIndex + 1
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Gantt Chart</h1>
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

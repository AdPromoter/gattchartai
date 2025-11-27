import { useState, useRef, useEffect, useMemo } from 'react'
import { format, parseISO, differenceInDays, addDays, startOfToday, isSameDay } from 'date-fns'
import ContextMenu from './ContextMenu'
import './GanttChart.css'

function GanttChart({ tasks, visibleColumns, customColumns = [], onToggleColumn, onUpdateTask, onAddRow, onAddColumn, onDeleteColumn, onInsertRow, onInsertColumn }) {
  const tableWrapperRef = useRef(null)
  const lastTaskIdRef = useRef(null)
  const today = startOfToday()
  const [editingCell, setEditingCell] = useState(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef(null)
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, index: null })

  const { dateRange, days } = useMemo(() => {
    const todayDate = startOfToday()
    const start = addDays(todayDate, -7)
    const end = addDays(todayDate, 30)
    const daysCount = differenceInDays(end, start)
    const daysArray = []
    for (let i = 0; i <= daysCount; i++) {
      daysArray.push(addDays(start, i))
    }
    
    if (tasks.length > 0) {
      const dates = tasks.flatMap(t => [
        t.startDate ? parseISO(t.startDate) : null,
        t.endDate ? parseISO(t.endDate) : null
      ]).filter(Boolean)
      
      if (dates.length > 0) {
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
        const newStart = addDays(minDate, -7)
        const newEnd = addDays(maxDate, 7)
        const newDaysCount = differenceInDays(newEnd, newStart)
        const newDaysArray = []
        for (let i = 0; i <= newDaysCount; i++) {
          newDaysArray.push(addDays(newStart, i))
        }
        return { dateRange: { start: newStart, end: newEnd }, days: newDaysArray }
      }
    }
    
    return { dateRange: { start, end }, days: daysArray }
  }, [tasks])

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return 0
    try {
      return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1
    } catch {
      return 0
    }
  }

  const handleCellClick = (taskId, field, currentValue) => {
    setEditingCell({ taskId, field })
    setEditValue(currentValue || '')
  }

  const handleCellBlur = (taskId, field) => {
    if (editingCell && editingCell.taskId === taskId && editingCell.field === field) {
      saveCellEdit(taskId, field, editValue)
    }
    setEditingCell(null)
    setEditValue('')
  }

  const handleCellKeyPress = (e, taskId, field) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveCellEdit(taskId, field, editValue)
      setEditingCell(null)
      setEditValue('')
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }

  const saveCellEdit = (taskId, field, value) => {
    if (!onUpdateTask) return
    
    // If editing a new row, create a new task
    if (taskId === 'new' || taskId.startsWith('empty-')) {
      const today = startOfToday()
      const newTask = {
        id: `task-${Date.now()}`,
        name: '',
        startDate: format(today, 'yyyy-MM-dd'),
        endDate: format(addDays(today, 7), 'yyyy-MM-dd'),
        status: 'planned',
        progress: 0,
        owner: ''
      }
      
      if (field === 'name') {
        newTask.name = value
      } else if (field === 'startDate') {
        newTask.startDate = value || format(today, 'yyyy-MM-dd')
      } else if (field === 'endDate') {
        newTask.endDate = value || format(addDays(today, 7), 'yyyy-MM-dd')
      } else if (field === 'owner') {
        newTask.owner = value
      } else if (field.startsWith('custom_')) {
        newTask[field] = value
      }
      
      if (value.trim() || field === 'name') {
        onUpdateTask('new', newTask)
      }
      return
    }
    
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    let updates = {}
    
    if (field === 'name') {
      updates.name = value
    } else if (field === 'startDate') {
      updates.startDate = value
    } else if (field === 'endDate') {
      updates.endDate = value
    } else if (field === 'owner') {
      updates.owner = value
    } else if (field.startsWith('custom_')) {
      updates[field] = value
    }

    onUpdateTask(taskId, updates)
  }

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingCell])

  // Scroll to newly added row and auto-edit
  useEffect(() => {
    if (lastTaskIdRef.current && tasks.length > 0) {
      const task = tasks.find(t => t.id === lastTaskIdRef.current)
      if (task) {
        setTimeout(() => {
          const rowElement = document.querySelector(`[data-task-id="${task.id}"]`)
          if (rowElement && tableWrapperRef.current) {
            rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Auto-focus the name cell
            setTimeout(() => {
              const nameCell = rowElement.querySelector('.cell-content')
              if (nameCell) {
                nameCell.click()
                nameCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
              }
            }, 300)
          }
          lastTaskIdRef.current = null
        }, 100)
      }
    }
  }, [tasks])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Ctrl+Alt+= or Cmd+Option+=
      const isShortcut = (e.ctrlKey || e.metaKey) && e.altKey && e.key === '='
      
      if (isShortcut) {
        e.preventDefault()
        // Check if a row or column is selected/focused
        const activeElement = document.activeElement
        const rowElement = activeElement.closest('tr[data-row-index]')
        const colHeader = activeElement.closest('th[data-col-index]')
        
        if (rowElement) {
          const rowIndex = parseInt(rowElement.getAttribute('data-row-index'))
          if (!isNaN(rowIndex)) {
            const rect = rowElement.getBoundingClientRect()
            showRowContextMenu(rect.left, rect.top, rowIndex)
          }
        } else if (colHeader) {
          const colIndex = parseInt(colHeader.getAttribute('data-col-index'))
          if (!isNaN(colIndex)) {
            const rect = colHeader.getBoundingClientRect()
            showColumnContextMenu(rect.left, rect.top + rect.height, colIndex)
          }
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const showRowContextMenu = (x, y, rowIndex) => {
    setContextMenu({
      visible: true,
      x,
      y,
      type: 'row',
      index: rowIndex
    })
  }

  const showColumnContextMenu = (x, y, colIndex) => {
    setContextMenu({
      visible: true,
      x,
      y,
      type: 'column',
      index: colIndex
    })
  }

  const handleContextMenuAction = (action) => {
    if (contextMenu.type === 'row' && contextMenu.index !== null) {
      if (action === 'insert-above') {
        const taskId = onInsertRow?.('above', contextMenu.index)
        if (taskId) lastTaskIdRef.current = taskId
      } else if (action === 'insert-below') {
        const taskId = onInsertRow?.('below', contextMenu.index)
        if (taskId) lastTaskIdRef.current = taskId
      }
    } else if (contextMenu.type === 'column' && contextMenu.index !== null) {
      if (action === 'insert-left') {
        onInsertColumn?.('left', contextMenu.index)
      } else if (action === 'insert-right') {
        onInsertColumn?.('right', contextMenu.index)
      }
    }
    setContextMenu({ visible: false, x: 0, y: 0, type: null, index: null })
  }

  // Helper to calculate column indices for context menu
  const columnIndices = useMemo(() => {
    let currentIndex = 0
    const indices = {}
    
    if (visibleColumns.task) {
      indices.task = currentIndex++
    }
    if (visibleColumns.startDate) {
      indices.startDate = currentIndex++
    }
    if (visibleColumns.duration) {
      indices.duration = currentIndex++
    }
    if (visibleColumns.endDate) {
      indices.endDate = currentIndex++
    }
    if (visibleColumns.owner) {
      indices.owner = currentIndex++
    }
    
    return { indices, baseIndex: currentIndex }
  }, [visibleColumns])

  const todayPosition = () => {
    const todayOffset = differenceInDays(today, dateRange.start)
    if (todayOffset < 0 || todayOffset >= days.length) return null
    return `${(todayOffset / days.length) * 100}%`
  }

  const getTaskPosition = (task) => {
    if (!task.startDate || !task.endDate) return null
    try {
      const taskStart = parseISO(task.startDate)
      const taskEnd = parseISO(task.endDate)
      const chartStart = dateRange.start
      
      const startOffset = differenceInDays(taskStart, chartStart)
      const duration = differenceInDays(taskEnd, taskStart) + 1
      
      return {
        left: `${(startOffset / days.length) * 100}%`,
        width: `${(duration / days.length) * 100}%`
      }
    } catch {
      return null
    }
  }

  const renderEmptyRow = (rowIndex, globalIndex) => {
    const rowId = `empty-${rowIndex}`
    const isEditing = editingCell?.taskId === rowId
    
    return (
      <tr 
        key={rowId} 
        className="empty-row"
        data-row-index={globalIndex}
        onContextMenu={(e) => {
          e.preventDefault()
          // For empty rows, use tasks.length as the insert position (insert at end)
          showRowContextMenu(e.clientX, e.clientY, tasks.length)
        }}
      >
        <td 
          className="row-number-cell"
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            // For empty rows, use tasks.length as the insert position (insert at end)
            showRowContextMenu(e.clientX, e.clientY, tasks.length)
          }}
        >
          {globalIndex + 1}
        </td>
        {visibleColumns.task && (
          <td className="cell-task">
            {isEditing && editingCell?.field === 'name' ? (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(rowId, 'name')}
                onKeyDown={(e) => handleCellKeyPress(e, rowId, 'name')}
                className="cell-input"
                placeholder="Enter task name..."
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(rowId, 'name', '')}
              >
                <span className="empty-cell"></span>
              </div>
            )}
          </td>
        )}
        {visibleColumns.startDate && (
          <td className="cell-date">
            {isEditing && editingCell?.field === 'startDate' ? (
              <input
                ref={editInputRef}
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(rowId, 'startDate')}
                onKeyDown={(e) => handleCellKeyPress(e, rowId, 'startDate')}
                className="cell-input"
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(rowId, 'startDate', '')}
              >
                <span className="empty-cell"></span>
              </div>
            )}
          </td>
        )}
        {visibleColumns.duration && (
          <td className="cell-duration">
            <div className="cell-content">
              <span className="empty-cell">—</span>
            </div>
          </td>
        )}
        {visibleColumns.endDate && (
          <td className="cell-date">
            {isEditing && editingCell?.field === 'endDate' ? (
              <input
                ref={editInputRef}
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(rowId, 'endDate')}
                onKeyDown={(e) => handleCellKeyPress(e, rowId, 'endDate')}
                className="cell-input"
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(rowId, 'endDate', '')}
              >
                <span className="empty-cell"></span>
              </div>
            )}
          </td>
        )}
        {visibleColumns.owner && (
          <td className="cell-owner">
            {isEditing && editingCell?.field === 'owner' ? (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(rowId, 'owner')}
                onKeyDown={(e) => handleCellKeyPress(e, rowId, 'owner')}
                className="cell-input"
                placeholder="Enter owner..."
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(rowId, 'owner', '')}
              >
                <span className="empty-cell"></span>
              </div>
            )}
          </td>
        )}
        {visibleColumns.timeline && (
          <td className="cell-timeline">
            <div className="timeline-cell-wrapper">
              <div className="timeline-grid">
                {days.map((day, dayIdx) => (
                  <div 
                    key={dayIdx} 
                    className={`timeline-day ${dayIdx % 7 === 0 ? 'week-start' : ''} ${isSameDay(day, today) ? 'today' : ''}`}
                  />
                ))}
              </div>
              {todayPosition() && rowIndex === 0 && (
                <div 
                  className="today-indicator"
                  style={{ left: todayPosition() }}
                >
                  <div className="today-line"></div>
                  <div className="today-label">Today</div>
                </div>
              )}
            </div>
          </td>
        )}
        {customColumns.filter(col => col.visible).map(col => {
          const colField = `custom_${col.id}`
          const isEditing = editingCell?.taskId === rowId && editingCell?.field === colField
          const value = ''
          return (
            <td key={col.id} className="cell-custom">
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleCellBlur(rowId, colField)}
                  onKeyDown={(e) => handleCellKeyPress(e, rowId, colField)}
                  className="cell-input"
                  placeholder={`Enter ${col.name.toLowerCase()}...`}
                />
              ) : (
                <div 
                  className="cell-content"
                  onDoubleClick={() => handleCellClick(rowId, colField, value)}
                >
                  <span className="empty-cell"></span>
                </div>
              )}
            </td>
          )
        })}
      </tr>
    )
  }

  const renderTaskRow = (task, idx) => {
    const duration = calculateDuration(task.startDate, task.endDate)
    const position = visibleColumns.timeline ? getTaskPosition(task) : null
    const isEditing = editingCell?.taskId === task.id
    
      return (
        <tr 
          key={task.id} 
          data-task-id={task.id} 
          data-row-index={idx}
          className={task.status === 'completed' ? 'completed' : ''}
          onContextMenu={(e) => {
            e.preventDefault()
            showRowContextMenu(e.clientX, e.clientY, idx)
          }}
        >
          <td 
            className="row-number-cell"
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              showRowContextMenu(e.clientX, e.clientY, idx)
            }}
          >
            {idx + 1}
          </td>
        {visibleColumns.task && (
          <td className="cell-task">
            {isEditing && editingCell?.field === 'name' ? (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(task.id, 'name')}
                onKeyDown={(e) => handleCellKeyPress(e, task.id, 'name')}
                className="cell-input"
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(task.id, 'name', task.name)}
              >
                {task.name || <span className="empty-cell">Click to edit</span>}
              </div>
            )}
          </td>
        )}
        {visibleColumns.startDate && (
          <td className="cell-date">
            {isEditing && editingCell?.field === 'startDate' ? (
              <input
                ref={editInputRef}
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(task.id, 'startDate')}
                onKeyDown={(e) => handleCellKeyPress(e, task.id, 'startDate')}
                className="cell-input"
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(task.id, 'startDate', task.startDate)}
              >
                {task.startDate ? format(parseISO(task.startDate), 'MMM dd, yyyy') : <span className="empty-cell">Click to edit</span>}
              </div>
            )}
          </td>
        )}
        {visibleColumns.duration && (
          <td className="cell-duration">
            <div className="cell-content">
              {duration > 0 ? `${duration} ${duration === 1 ? 'day' : 'days'}` : '—'}
            </div>
          </td>
        )}
        {visibleColumns.endDate && (
          <td className="cell-date">
            {isEditing && editingCell?.field === 'endDate' ? (
              <input
                ref={editInputRef}
                type="date"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(task.id, 'endDate')}
                onKeyDown={(e) => handleCellKeyPress(e, task.id, 'endDate')}
                className="cell-input"
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(task.id, 'endDate', task.endDate)}
              >
                {task.endDate ? format(parseISO(task.endDate), 'MMM dd, yyyy') : <span className="empty-cell">Click to edit</span>}
              </div>
            )}
          </td>
        )}
        {visibleColumns.owner && (
          <td className="cell-owner">
            {isEditing && editingCell?.field === 'owner' ? (
              <input
                ref={editInputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleCellBlur(task.id, 'owner')}
                onKeyDown={(e) => handleCellKeyPress(e, task.id, 'owner')}
                className="cell-input"
              />
            ) : (
              <div 
                className="cell-content"
                onDoubleClick={() => handleCellClick(task.id, 'owner', task.owner)}
              >
                {task.owner || <span className="empty-cell">Click to edit</span>}
              </div>
            )}
          </td>
        )}
        {visibleColumns.timeline && (
          <td className="cell-timeline">
            <div className="timeline-cell-wrapper">
              <div className="timeline-grid">
                {days.map((day, dayIdx) => (
                  <div 
                    key={dayIdx} 
                    className={`timeline-day ${dayIdx % 7 === 0 ? 'week-start' : ''} ${isSameDay(day, today) ? 'today' : ''}`}
                  />
                ))}
              </div>
              {position && (
                <div
                  className={`gantt-bar ${task.status || 'planned'}`}
                  style={{
                    left: position.left,
                    width: position.width
                  }}
                >
                  <span className="bar-label">{task.name}</span>
                </div>
              )}
              {todayPosition() && idx === 0 && (
                <div 
                  className="today-indicator"
                  style={{ left: todayPosition() }}
                >
                  <div className="today-line"></div>
                  <div className="today-label">Today</div>
                </div>
              )}
            </div>
          </td>
        )}
        {customColumns.filter(col => col.visible).map(col => {
          const colField = `custom_${col.id}`
          const isEditing = editingCell?.taskId === task.id && editingCell?.field === colField
          const value = task[colField] || ''
          return (
            <td key={col.id} className="cell-custom">
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleCellBlur(task.id, colField)}
                  onKeyDown={(e) => handleCellKeyPress(e, task.id, colField)}
                  className="cell-input"
                />
              ) : (
                <div 
                  className="cell-content"
                  onDoubleClick={() => handleCellClick(task.id, colField, value)}
                >
                  {value || <span className="empty-cell">Click to edit</span>}
                </div>
              )}
            </td>
          )
        })}
      </tr>
    )
  }

  // Always show at least 20 empty rows (like Excel)
  const emptyRowsCount = Math.max(20 - tasks.length, 5)

  return (
    <div className="gantt-chart-excel">
      <div className="gantt-table-wrapper" ref={tableWrapperRef}>
        <table className="gantt-table">
          <thead>
          <tr>
            <th className="row-number-header"></th>
            {visibleColumns.task && (
              <th 
                className="col-task"
                data-col-index={columnIndices.indices.task}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (columnIndices.indices.task !== undefined) {
                    showColumnContextMenu(e.clientX, e.clientY, columnIndices.indices.task)
                  }
                }}
              >
                Task
                <button className="col-toggle" onClick={() => onToggleColumn('task')}>×</button>
              </th>
            )}
            {visibleColumns.startDate && (
              <th 
                className="col-date"
                data-col-index={columnIndices.indices.startDate}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (columnIndices.indices.startDate !== undefined) {
                    showColumnContextMenu(e.clientX, e.clientY, columnIndices.indices.startDate)
                  }
                }}
              >
                Start Date
                <button className="col-toggle" onClick={() => onToggleColumn('startDate')}>×</button>
              </th>
            )}
            {visibleColumns.duration && (
              <th 
                className="col-duration"
                data-col-index={columnIndices.indices.duration}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (columnIndices.indices.duration !== undefined) {
                    showColumnContextMenu(e.clientX, e.clientY, columnIndices.indices.duration)
                  }
                }}
              >
                Duration
                <button className="col-toggle" onClick={() => onToggleColumn('duration')}>×</button>
              </th>
            )}
            {visibleColumns.endDate && (
              <th 
                className="col-date"
                data-col-index={columnIndices.indices.endDate}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (columnIndices.indices.endDate !== undefined) {
                    showColumnContextMenu(e.clientX, e.clientY, columnIndices.indices.endDate)
                  }
                }}
              >
                End Date
                <button className="col-toggle" onClick={() => onToggleColumn('endDate')}>×</button>
              </th>
            )}
            {visibleColumns.owner && (
              <th 
                className="col-owner"
                data-col-index={columnIndices.indices.owner}
                onContextMenu={(e) => {
                  e.preventDefault()
                  if (columnIndices.indices.owner !== undefined) {
                    showColumnContextMenu(e.clientX, e.clientY, columnIndices.indices.owner)
                  }
                }}
              >
                Owner
                <button className="col-toggle" onClick={() => onToggleColumn('owner')}>×</button>
              </th>
            )}
            {visibleColumns.timeline && (
              <th className="col-timeline">
                Timeline
              </th>
            )}
            {customColumns.filter(col => col.visible).map((col, idx) => {
              const colIndex = columnIndices.baseIndex + idx
              return (
                <th 
                  key={col.id} 
                  className="col-custom"
                  data-col-index={colIndex}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    showColumnContextMenu(e.clientX, e.clientY, colIndex)
                  }}
                >
                  {col.name}
                  <button className="col-toggle" onClick={() => onDeleteColumn(col.id)} title="Delete column">×</button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {/* Render task rows */}
          {tasks.map((task, idx) => renderTaskRow(task, idx))}
          
          {/* Always show empty editable rows */}
          {Array.from({ length: emptyRowsCount }, (_, idx) => 
            renderEmptyRow(idx, tasks.length + idx)
          )}
          </tbody>
        </table>
      </div>
      
      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        visible={contextMenu.visible}
        items={contextMenu.type === 'row' ? [
          {
            label: 'Insert 1 row above',
            onClick: () => handleContextMenuAction('insert-above'),
            shortcut: '⌘+Option+='
          },
          {
            label: 'Insert 1 row below',
            onClick: () => handleContextMenuAction('insert-below'),
            shortcut: '⌘+Option+='
          }
        ] : contextMenu.type === 'column' ? [
          {
            label: 'Insert 1 column left',
            onClick: () => handleContextMenuAction('insert-left')
          },
          {
            label: 'Insert 1 column right',
            onClick: () => handleContextMenuAction('insert-right')
          }
        ] : []}
        onClose={() => setContextMenu({ visible: false, x: 0, y: 0, type: null, index: null })}
      />
    </div>
  )
}

export default GanttChart

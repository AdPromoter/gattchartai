import { parse, format, addDays, startOfToday, parseISO } from 'date-fns'

// AI Service - Connects to real LLM API (OpenAI) for natural language understanding
// Falls back to simple parsing if no API key is configured

// Get API key from environment variable
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const USE_AI = !!OPENAI_API_KEY

/**
 * Main function to parse AI task input
 * Uses real AI if API key is available, otherwise falls back to simple parsing
 * 
 * @param {string} input - User's natural language input
 * @param {Object} context - Full context including all sheets, active sheet, tasks, etc.
 * @param {Array} context.sheets - All sheets in the project
 * @param {string} context.activeSheetId - Currently active sheet ID
 * @param {Array} context.activeSheetTasks - Tasks in the active sheet
 * @param {Array} context.customColumns - Custom columns in the active sheet
 */
export async function parseAITask(input, context = {}) {
  // Ensure context is an object
  if (!context || typeof context !== 'object') {
    context = {}
  }
  const { sheets = [], activeSheetId = null, activeSheetTasks = [], customColumns = [] } = context
  
  // Use real AI if API key is configured
  if (USE_AI) {
    try {
      return await parseAITaskWithLLM(input, context)
    } catch (error) {
      console.error('AI API error, falling back to simple parser:', error)
      // Fallback to simple parsing on error
      return parseAITaskSimple(input, activeSheetTasks, context)
    }
  }
  
  // Fallback to simple parsing if no API key
  return parseAITaskSimple(input, activeSheetTasks, context)
}

/**
 * Real AI integration using OpenAI API
 */
async function parseAITaskWithLLM(input, context = {}) {
  const { sheets = [], activeSheetId = null, activeSheetTasks = [], customColumns = [] } = context
  const today = format(startOfToday(), 'yyyy-MM-dd')
  
  // Find active sheet
  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0]
  const activeSheetName = activeSheet?.name || 'Main Project'
  
  // Prepare context about all sheets
  const sheetsContext = sheets.length > 0
    ? `\n\nAvailable sheets:\n${sheets.map(s => 
        `- "${s.name}" (ID: ${s.id})${s.id === activeSheetId ? ' [CURRENTLY ACTIVE]' : ''} - ${s.tasks?.length || 0} tasks`
      ).join('\n')}`
    : '\n\nNo sheets yet.'
  
  // Prepare context about tasks in active sheet
  const tasksContext = activeSheetTasks.length > 0
    ? `\n\nTasks in current sheet "${activeSheetName}":\n${activeSheetTasks.map(t => {
        const customFields = customColumns.map(col => {
          const field = `custom_${col.id}`
          return t[field] ? ` ${col.name}: ${t[field]}` : ''
        }).filter(Boolean).join('')
        return `- "${t.name}" (ID: ${t.id}) - ${t.startDate || 'no start'} to ${t.endDate || 'no end'}${t.owner ? ` - Owner: ${t.owner}` : ''} - Status: ${t.status || 'planned'}${t.progress !== undefined ? ` - Progress: ${t.progress}%` : ''}${customFields}`
      }).join('\n')}`
    : `\n\nNo tasks in current sheet "${activeSheetName}" yet.`
  
  // Prepare custom columns context
  const columnsContext = customColumns.length > 0
    ? `\n\nCustom columns in current sheet: ${customColumns.map(col => col.name).join(', ')}`
    : '\n\nNo custom columns in current sheet.'

  const systemPrompt = `You are an AI assistant that helps manage a Gantt chart (project timeline) with full control over all features.

Your job is to understand natural language commands and convert them into structured actions.

AVAILABLE ACTIONS:
1. "add" - Create a new task in the current sheet
2. "update" - Modify an existing task (identify by name or ID, can be in any sheet)
3. "delete" - Remove a task (identify by name or ID, can be in any sheet)
4. "create-sheet" - Create a new sheet/tab
5. "rename-sheet" - Rename an existing sheet (identify by name or ID)
6. "switch-sheet" - Switch to a different sheet (identify by name or ID)
7. "delete-sheet" - Delete a sheet (identify by name or ID, cannot delete if it's the last sheet)
8. "add-column" - Add a custom column to the current sheet
9. "delete-column" - Delete a custom column from the current sheet

TASK STRUCTURE:
- name (required): The task name/description
- startDate: Start date in YYYY-MM-DD format
- endDate: End date in YYYY-MM-DD format  
- owner: Person assigned to the task
- status: "planned", "ongoing", or "completed"
- progress: Number 0-100
- custom_<columnId>: Value for custom columns (use column name in updates, AI will map to columnId)

SHEET STRUCTURE:
- id: Unique sheet identifier
- name: Sheet display name
- tasks: Array of tasks
- customColumns: Array of custom column definitions

CUSTOM COLUMN STRUCTURE:
- id: Unique column identifier (format: custom_<id>)
- name: Column display name
- visible: Boolean

Today's date: ${today}

UNDERSTANDING COMMANDS:
- Dates: "today", "tomorrow", "next week", "January 15", "Jan 15", "1/15", "in 2 weeks", "next Monday"
- Task references: Use task names (fuzzy matching) or IDs. Can reference tasks across all sheets.
- Sheet references: Use sheet names (fuzzy matching) or IDs
- Status updates: "mark as ongoing", "set to completed", "mark as done"
- Progress: "set to 50%", "update progress to 75%"
- Custom fields: "set Priority to High", "update Budget to $5000" (if custom columns exist)

IMPORTANT:
- When referencing tasks or sheets, use fuzzy matching on names
- Always include sheetId when updating/deleting tasks in non-active sheets
- For custom column updates, use the column name in the updates object, the system will map it
- When switching sheets, the user will see that sheet's tasks

Return ONLY valid JSON in this exact format:
{
  "action": "add" | "update" | "delete" | "create-sheet" | "rename-sheet" | "switch-sheet" | "delete-sheet" | "add-column" | "delete-column",
  "taskId": "task-id-here" (for update/delete task),
  "sheetId": "sheet-id-here" (for sheet operations, or when task is in different sheet),
  "task": { task object } (for add),
  "updates": { field: value } (for update task - can include custom fields by column name),
  "sheet": { id, name, tasks: [] } (for create-sheet),
  "sheetName": "new name" (for rename-sheet),
  "columnName": "column name" (for add-column/delete-column)
}`

  const userPrompt = `${input}${sheetsContext}${tasksContext}${columnsContext}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Using mini for cost-effectiveness, can switch to gpt-4o
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3 // Lower temperature for more consistent, structured responses
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No response from AI')
  }

  // Parse the JSON response
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    throw new Error(`Invalid JSON from AI: ${content}`)
  }

  // Validate and normalize the response
  return normalizeAIResponse(parsed, context)
}

/**
 * Normalize and validate AI response
 */
function normalizeAIResponse(parsed, context = {}) {
  const { sheets = [], activeSheetId = null, activeSheetTasks = [], customColumns = [] } = context
  const today = startOfToday()
  
  // Handle create-sheet action
  if (parsed.action === 'create-sheet') {
    return {
      action: 'create-sheet',
      sheet: {
        id: `sheet-${Date.now()}`,
        name: parsed.sheet?.name || parsed.sheetName || `Sheet ${Date.now()}`,
        tasks: [],
        customColumns: []
      }
    }
  }

  // Handle rename-sheet action
  if (parsed.action === 'rename-sheet') {
    const sheetId = parsed.sheetId || findSheetByName(sheets, parsed.sheetName || '')?.id
    const targetSheet = sheetId 
      ? sheets.find(s => s.id === sheetId)
      : findSheetByName(sheets, parsed.sheetName || '')
    
    if (targetSheet && parsed.sheetName) {
      return {
        action: 'rename-sheet',
        sheetId: targetSheet.id,
        sheetName: parsed.sheetName.trim()
      }
    }
  }

  // Handle switch-sheet action
  if (parsed.action === 'switch-sheet') {
    const sheetId = parsed.sheetId || findSheetByName(sheets, parsed.sheetName || '')?.id
    const targetSheet = sheetId 
      ? sheets.find(s => s.id === sheetId)
      : findSheetByName(sheets, parsed.sheetName || '')
    
    if (targetSheet) {
      return {
        action: 'switch-sheet',
        sheetId: targetSheet.id
      }
    }
  }

  // Handle delete-sheet action
  if (parsed.action === 'delete-sheet') {
    const sheetId = parsed.sheetId || findSheetByName(sheets, parsed.sheetName || '')?.id
    const targetSheet = sheetId 
      ? sheets.find(s => s.id === sheetId)
      : findSheetByName(sheets, parsed.sheetName || '')
    
    if (targetSheet) {
      return {
        action: 'delete-sheet',
        sheetId: targetSheet.id
      }
    }
  }

  // Handle add-column action
  if (parsed.action === 'add-column') {
    if (parsed.columnName) {
      return {
        action: 'add-column',
        columnName: parsed.columnName.trim()
      }
    }
  }

  // Handle delete-column action
  if (parsed.action === 'delete-column') {
    const column = findColumnByName(customColumns, parsed.columnName || '')
    if (column) {
      return {
        action: 'delete-column',
        columnId: column.id
      }
    }
  }

  // Handle delete task action
  if (parsed.action === 'delete' && (parsed.taskId || parsed.taskName)) {
    // Search across all sheets if sheetId is specified, otherwise current sheet
    const searchSheetId = parsed.sheetId || activeSheetId
    const searchSheet = sheets.find(s => s.id === searchSheetId)
    const searchTasks = searchSheet?.tasks || activeSheetTasks
    
    const task = parsed.taskId
      ? searchTasks.find(t => t.id === parsed.taskId)
      : findTaskByName(searchTasks, parsed.taskName || parsed.taskId)
    
    if (task) {
      return {
        action: 'delete',
        taskId: task.id,
        sheetId: searchSheetId
      }
    }
  }

  // Handle update task action
  if (parsed.action === 'update' && (parsed.taskId || parsed.taskName)) {
    // Search across all sheets if sheetId is specified, otherwise current sheet
    const searchSheetId = parsed.sheetId || activeSheetId
    const searchSheet = sheets.find(s => s.id === searchSheetId)
    const searchTasks = searchSheet?.tasks || activeSheetTasks
    
    const task = parsed.taskId
      ? searchTasks.find(t => t.id === parsed.taskId)
      : findTaskByName(searchTasks, parsed.taskName || parsed.taskId)
    
    if (task && parsed.updates) {
      const updates = { ...parsed.updates }
      
      // Map custom column names to field names (custom_<id>)
      Object.keys(updates).forEach(key => {
        if (key !== 'name' && key !== 'startDate' && key !== 'endDate' && key !== 'owner' && key !== 'status' && key !== 'progress' && !key.startsWith('custom_')) {
          const column = findColumnByName(customColumns, key)
          if (column) {
            updates[`custom_${column.id}`] = updates[key]
            delete updates[key]
          }
        }
      })
      
      // Normalize dates
      if (updates.startDate) {
        updates.startDate = normalizeDate(updates.startDate)
      }
      if (updates.endDate) {
        updates.endDate = normalizeDate(updates.endDate)
      }

      return {
        action: 'update',
        taskId: task.id,
        sheetId: searchSheetId,
        updates
      }
    }
  }

  // Handle add task action
  if (parsed.action === 'add' && parsed.task) {
    const task = parsed.task
    
    // Ensure required fields
    if (!task.name) {
      return null // Invalid task
    }

    // Normalize dates
    const startDate = task.startDate ? normalizeDate(task.startDate) : format(today, 'yyyy-MM-dd')
    const endDate = task.endDate ? normalizeDate(task.endDate) : format(addDays(today, 7), 'yyyy-MM-dd')

    // Ensure end date is after start date
    const finalEndDate = parseISO(endDate) >= parseISO(startDate) 
      ? endDate 
      : format(addDays(parseISO(startDate), 7), 'yyyy-MM-dd')

    const newTask = {
      id: `task-${Date.now()}`,
      name: task.name,
      startDate: startDate,
      endDate: finalEndDate,
      status: task.status || 'planned',
      progress: task.progress || 0,
      owner: task.owner || null
    }

    // Add custom field values if provided
    if (task.customFields) {
      Object.keys(task.customFields).forEach(columnName => {
        const column = findColumnByName(customColumns, columnName)
        if (column) {
          newTask[`custom_${column.id}`] = task.customFields[columnName]
        }
      })
    }

    return {
      action: 'add',
      task: newTask
    }
  }

  // If action not recognized, return null
  return null
}

/**
 * Helper function to find sheet by name (fuzzy matching)
 */
function findSheetByName(sheets, searchName) {
  if (!searchName || !sheets || sheets.length === 0) return null
  
  const lowerSearch = searchName.toLowerCase().trim()
  
  // Exact match
  let sheet = sheets.find(s => s.name.toLowerCase() === lowerSearch)
  if (sheet) return sheet
  
  // Partial match
  sheet = sheets.find(s => 
    s.name.toLowerCase().includes(lowerSearch) || 
    lowerSearch.includes(s.name.toLowerCase())
  )
  if (sheet) return sheet
  
  // Fuzzy match - check key words
  const searchWords = lowerSearch.split(/\s+/).filter(w => w.length > 2)
  sheet = sheets.find(s => {
    const sheetWords = s.name.toLowerCase().split(/\s+/)
    return searchWords.some(sw => 
      sheetWords.some(sw2 => sw2.includes(sw) || sw.includes(sw2))
    )
  })
  
  return sheet || null
}

/**
 * Helper function to find column by name (fuzzy matching)
 */
function findColumnByName(columns, searchName) {
  if (!searchName || !columns || columns.length === 0) return null
  
  const lowerSearch = searchName.toLowerCase().trim()
  
  // Exact match
  let column = columns.find(c => c.name.toLowerCase() === lowerSearch)
  if (column) return column
  
  // Partial match
  column = columns.find(c => 
    c.name.toLowerCase().includes(lowerSearch) || 
    lowerSearch.includes(c.name.toLowerCase())
  )
  if (column) return column
  
  return null
}

/**
 * Normalize date strings to YYYY-MM-DD format
 */
function normalizeDate(dateStr) {
  if (!dateStr) return format(startOfToday(), 'yyyy-MM-dd')
  
  try {
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr
    }

    // Try parsing various formats
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return format(date, 'yyyy-MM-dd')
    }

    // Try relative dates
    const lower = dateStr.toLowerCase().trim()
    const today = startOfToday()
    
    if (lower.includes('today')) return format(today, 'yyyy-MM-dd')
    if (lower.includes('tomorrow')) return format(addDays(today, 1), 'yyyy-MM-dd')
    if (lower.includes('next week')) return format(addDays(today, 7), 'yyyy-MM-dd')
    
  } catch (e) {
    console.error('Date normalization error:', e)
  }
  
  // Default to today if parsing fails
  return format(startOfToday(), 'yyyy-MM-dd')
}

/**
 * Simple fallback parser (original implementation)
 * Used when no API key is configured
 */
function parseAITaskSimple(input, existingTasks = [], context = {}) {
  const { sheets = [], activeSheetId = null, customColumns = [] } = context
  const lower = input.toLowerCase()
  const trimmed = input.trim()
  
  // Handle sheet creation
  if (lower.includes('create sheet') || lower.includes('new sheet') || lower.includes('add sheet')) {
    const sheetNameMatch = input.match(/(?:create|new|add)\s+(?:sheet|tab)\s+(?:called|named)?\s*["']?([^"']+)["']?/i)
    const sheetName = sheetNameMatch?.[1]?.trim() || `Sheet ${Date.now()}`
    return {
      action: 'create-sheet',
      sheet: {
        id: `sheet-${Date.now()}`,
        name: sheetName,
        tasks: [],
        customColumns: []
      }
    }
  }

  // Handle sheet rename
  if (lower.includes('rename sheet') || lower.includes('rename tab')) {
    const sheetNameMatch = input.match(/(?:rename)\s+(?:sheet|tab)\s+["']?([^"']+)["']?\s+(?:to|as)\s+["']?([^"']+)["']?/i)
    if (sheetNameMatch) {
      const oldName = sheetNameMatch[1]?.trim()
      const newName = sheetNameMatch[2]?.trim()
      const sheet = findSheetByName(sheets, oldName)
      if (sheet && newName) {
        return {
          action: 'rename-sheet',
          sheetId: sheet.id,
          sheetName: newName
        }
      }
    }
  }

  // Handle sheet switch
  if (lower.includes('switch to') || lower.includes('go to') || lower.includes('open sheet') || lower.includes('show sheet')) {
    const sheetNameMatch = input.match(/(?:switch to|go to|open|show)\s+(?:sheet|tab)?\s*["']?([^"']+)["']?/i)
    const sheetName = sheetNameMatch?.[1]?.trim()
    if (sheetName) {
      const sheet = findSheetByName(sheets, sheetName)
      if (sheet) {
        return {
          action: 'switch-sheet',
          sheetId: sheet.id
        }
      }
    }
  }

  // Handle sheet delete
  if (lower.includes('delete sheet') || lower.includes('remove sheet')) {
    const sheetNameMatch = input.match(/(?:delete|remove)\s+(?:sheet|tab)\s+["']?([^"']+)["']?/i)
    const sheetName = sheetNameMatch?.[1]?.trim()
    if (sheetName) {
      const sheet = findSheetByName(sheets, sheetName)
      if (sheet) {
        return {
          action: 'delete-sheet',
          sheetId: sheet.id
        }
      }
    }
  }

  // Handle add column
  if (lower.includes('add column') || lower.includes('create column') || lower.includes('new column')) {
    const columnNameMatch = input.match(/(?:add|create|new)\s+column\s+(?:called|named)?\s*["']?([^"']+)["']?/i)
    const columnName = columnNameMatch?.[1]?.trim()
    if (columnName) {
      return {
        action: 'add-column',
        columnName: columnName
      }
    }
  }

  // Handle delete column
  if (lower.includes('delete column') || lower.includes('remove column')) {
    const columnNameMatch = input.match(/(?:delete|remove)\s+column\s+["']?([^"']+)["']?/i)
    const columnName = columnNameMatch?.[1]?.trim()
    if (columnName) {
      const column = findColumnByName(customColumns, columnName)
      if (column) {
        return {
          action: 'delete-column',
          columnId: column.id
        }
      }
    }
  }
  
  // Handle status updates
  if (lower.includes('ongoing') || lower.includes('in progress') || lower.includes('started')) {
    const taskNameMatch = input.match(/["']([^"']+)["']|(\w+(?:\s+\w+)*)/)
    const taskName = taskNameMatch?.[1] || taskNameMatch?.[2]
    const task = findTaskByName(existingTasks, taskName)
    
    if (task) {
      return {
        action: 'update',
        taskId: task.id,
        updates: {
          status: 'ongoing',
          progress: task.progress || 10
        }
      }
    }
  }
  
  // Handle completion
  if (lower.includes('complete') || lower.includes('done') || lower.includes('finished')) {
    const taskNameMatch = input.match(/["']([^"']+)["']|(\w+(?:\s+\w+)*)/)
    const taskName = taskNameMatch?.[1] || taskNameMatch?.[2]
    const task = findTaskByName(existingTasks, taskName)
    
    if (task) {
      return {
        action: 'update',
        taskId: task.id,
        updates: {
          status: 'completed',
          progress: 100
        }
      }
    }
  }
  
  // Handle delete
  if (lower.includes('delete') || lower.includes('remove')) {
    const taskNameMatch = input.match(/["']([^"']+)["']|(\w+(?:\s+\w+)*)/)
    const taskName = taskNameMatch?.[1] || taskNameMatch?.[2]
    const task = findTaskByName(existingTasks, taskName)
    
    if (task) {
      return {
        action: 'delete',
        taskId: task.id
      }
    }
  }
  
  // Default: Try to extract task info (simple version)
  const taskNameMatch = input.match(/["']([^"']+)["']|([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
  const taskName = taskNameMatch?.[1] || taskNameMatch?.[2] || trimmed
  
  if (!taskName || taskName.length < 2) {
    return null
  }
  
  return {
    action: 'add',
    task: {
      id: `task-${Date.now()}`,
      name: taskName,
      startDate: format(startOfToday(), 'yyyy-MM-dd'),
      endDate: format(addDays(startOfToday(), 7), 'yyyy-MM-dd'),
      status: 'planned',
      progress: 0,
      owner: null
    }
  }
}

/**
 * Helper function to find task by name (fuzzy matching)
 */
function findTaskByName(tasks, searchName) {
  if (!searchName || !tasks || tasks.length === 0) return null
  
  const lowerSearch = searchName.toLowerCase().trim()
  
  // Exact match
  let task = tasks.find(t => t.name.toLowerCase() === lowerSearch)
  if (task) return task
  
  // Partial match
  task = tasks.find(t => 
    t.name.toLowerCase().includes(lowerSearch) || 
    lowerSearch.includes(t.name.toLowerCase())
  )
  if (task) return task
  
  // Fuzzy match - check key words
  const searchWords = lowerSearch.split(/\s+/).filter(w => w.length > 3)
  task = tasks.find(t => {
    const taskWords = t.name.toLowerCase().split(/\s+/)
    return searchWords.some(sw => 
      taskWords.some(tw => tw.includes(sw) || sw.includes(tw))
    )
  })
  
  return task || null
}


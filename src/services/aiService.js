import { parse, format, addDays, startOfToday, parseISO } from 'date-fns'

// AI Service - Connects to real LLM API (OpenAI) for natural language understanding
// Falls back to simple parsing if no API key is configured

// Get API key from environment variable
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''
const USE_AI = !!OPENAI_API_KEY

/**
 * Main function to parse AI task input
 * Uses real AI if API key is available, otherwise falls back to simple parsing
 */
export async function parseAITask(input, existingTasks = []) {
  // Use real AI if API key is configured
  if (USE_AI) {
    try {
      return await parseAITaskWithLLM(input, existingTasks)
    } catch (error) {
      console.error('AI API error, falling back to simple parser:', error)
      // Fallback to simple parsing on error
      return parseAITaskSimple(input, existingTasks)
    }
  }
  
  // Fallback to simple parsing if no API key
  return parseAITaskSimple(input, existingTasks)
}

/**
 * Real AI integration using OpenAI API
 */
async function parseAITaskWithLLM(input, existingTasks = []) {
  const today = format(startOfToday(), 'yyyy-MM-dd')
  
  // Prepare context about existing tasks
  const tasksContext = existingTasks.length > 0
    ? `\n\nExisting tasks:\n${existingTasks.map(t => 
        `- "${t.name}" (${t.startDate || 'no start'} to ${t.endDate || 'no end'})${t.owner ? ` - Owner: ${t.owner}` : ''}`
      ).join('\n')}`
    : '\n\nNo existing tasks yet.'

  const systemPrompt = `You are an AI assistant that helps manage a Gantt chart (project timeline). 

Your job is to understand natural language commands and convert them into structured actions.

Available actions:
1. "add" - Create a new task
2. "update" - Modify an existing task (must identify which task)
3. "delete" - Remove a task
4. "create-sheet" - Create a new sheet/tab

Task structure:
- name (required): The task name/description
- startDate: Start date in YYYY-MM-DD format
- endDate: End date in YYYY-MM-DD format  
- owner: Person assigned to the task
- status: "planned", "ongoing", or "completed"
- progress: Number 0-100

Today's date: ${today}

Understand dates in various formats:
- "today", "tomorrow", "next week"
- "January 15", "Jan 15", "1/15"
- "in 2 weeks", "next Monday"

If user says things like "mark as ongoing" or "set to 50%", identify the task from existing tasks list.

Return ONLY valid JSON in this exact format:
{
  "action": "add" | "update" | "delete" | "create-sheet",
  "taskId": "task-id-here" (only for update/delete),
  "task": { task object } (for add),
  "updates": { field: value } (for update),
  "sheet": { id, name, tasks: [] } (for create-sheet)
}`

  const userPrompt = `${input}${tasksContext}`

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
  return normalizeAIResponse(parsed, existingTasks)
}

/**
 * Normalize and validate AI response
 */
function normalizeAIResponse(parsed, existingTasks) {
  const today = startOfToday()
  
  // Handle create-sheet action
  if (parsed.action === 'create-sheet') {
    return {
      action: 'create-sheet',
      sheet: {
        id: `sheet-${Date.now()}`,
        name: parsed.sheet?.name || `Sheet ${Date.now()}`,
        tasks: []
      }
    }
  }

  // Handle delete action
  if (parsed.action === 'delete' && parsed.taskId) {
    // Find task by ID or name
    const task = existingTasks.find(t => t.id === parsed.taskId || t.name.toLowerCase() === parsed.taskId?.toLowerCase())
    if (task) {
      return {
        action: 'delete',
        taskId: task.id
      }
    }
  }

  // Handle update action
  if (parsed.action === 'update' && parsed.taskId) {
    const task = existingTasks.find(t => t.id === parsed.taskId || t.name.toLowerCase() === parsed.taskId?.toLowerCase())
    if (task) {
      const updates = parsed.updates || {}
      
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
        updates
      }
    }
  }

  // Handle add action
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

    return {
      action: 'add',
      task: {
        id: `task-${Date.now()}`,
        name: task.name,
        startDate: startDate,
        endDate: finalEndDate,
        status: task.status || 'planned',
        progress: task.progress || 0,
        owner: task.owner || null
      }
    }
  }

  // If action not recognized, return null
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
function parseAITaskSimple(input, existingTasks = []) {
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
        tasks: []
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


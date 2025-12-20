# AI Gantt Chart - First Principles Design

An intelligent Gantt chart application built on Elon Musk's first principles approach: simplicity, automation, and rapid iteration. Features AI-powered voice and text input for natural task management.

## 🚀 Features

### Excel-like Interface
- **Customizable Columns**: Task, Start Date, Duration (auto-calculated), End Date, Owner, Timeline
- **Multiple Sheets/Tabs**: Create different sheets for different units/divisions (like Excel)
- **Today's Date Indicator**: Visual red line showing current date on the timeline
- **Table View**: Clean, spreadsheet-like layout with sortable columns
- **Show/Hide Columns**: Toggle column visibility by clicking the × on column headers

### AI-Powered
- **AI-Powered Input**: Use voice or text to add and update tasks naturally
- **Auto-Updating Chart**: Chart automatically updates when you tell the AI about task changes
- **Floating AI Assistant**: Beautiful floating UI that follows you as you work
- **Voice Recognition**: Built-in Web Speech API for hands-free task management
- **Smart Parsing**: Understands natural language like "Add task Build landing page from Jan 15 to Jan 25 assigned to John"
- **Real-time Status Updates**: Tell AI "Mark Build landing page as ongoing" and watch it update instantly
- **Sheet Management**: Create new sheets via AI - "Create new sheet called Marketing"

### Automatic Calculations
- **Duration**: Automatically calculated from start and end dates
- **Today Indicator**: Automatically positioned on the timeline
- **Smart Date Parsing**: Handles multiple date formats and relative dates

### Modern Design
- **Dark Theme**: Clean, dark UI with smooth animations
- **Responsive Layout**: Works on all screen sizes

## 🎯 First Principles Approach

This project follows Elon Musk's design principles:

1. **Start from fundamental truths** - What do users actually need? Task visualization + easy input
2. **Remove unnecessary complexity** - No bloated features, just what works
3. **Automate everything** - AI handles parsing, chart updates automatically
4. **Iterate rapidly** - Built with modern tools (React + Vite) for fast development
5. **Make it intuitive** - Natural language input instead of complex forms

## 📦 Installation

```bash
npm install
```

## 🏃 Running

```bash
npm run dev
```

The app will open at `http://localhost:3000`

## 🚀 Deployment

The app is deployed to Firebase Hosting:
- **Live URL**: https://gantt-chart-ai.web.app
- **Project ID**: gantt-chart-ai

### Deploy Updates

```bash
npm run build
npm run deploy
```

See `DEPLOYMENT.md` for detailed deployment instructions.

## 🤖 AI Setup (Optional but Recommended)

To enable real AI understanding (instead of simple pattern matching):

1. **Get OpenAI API Key**: https://platform.openai.com/api-keys
2. **Create `.env` file** in the root directory:
   ```bash
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```
3. **Restart the dev server**

**Without API Key**: The app works but uses basic pattern matching
**With API Key**: The app uses GPT-4o-mini for intelligent natural language understanding

See `ENV_SETUP.md` for detailed instructions.

## 🎤 Usage

### Voice Input
1. Click the floating AI assistant button (bottom right)
2. Click the microphone icon
3. Speak your task naturally

### Text Input
1. Open the AI assistant panel
2. Type your task in the input field
3. Press Enter or click Send

### Examples

**Add a task:**
- "Add task Build landing page from January 15 to January 25 assigned to John"
- "Create task Design logo starting today for 2 weeks owned by Sarah"
- "New task: Complete documentation by next Friday for Mike"

**Update status:**
- "Mark Build landing page as ongoing"
- "Set Design logo to in progress"

**Update progress:**
- "Update Build landing page progress to 50%"
- "Set documentation to 75% complete"

**Complete tasks:**
- "Mark Build landing page as complete"
- "Set Design logo to done"

**Create new sheets:**
- "Create new sheet called Marketing"
- "Add sheet named Engineering Division"
- "New sheet for Sales Team"

**Column Customization:**
- Click the × button on any column header to hide it
- Columns: Task, Start Date, Duration, End Date, Owner, Timeline

## 🏗️ Architecture

- **React 18** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **date-fns** - Date manipulation
- **Web Speech API** - Voice recognition
- **Custom AI Parser** - Natural language understanding (easily replaceable with LLM API)

## 🔧 Customization

### Connecting to AI API

To use a real AI model (OpenAI, Anthropic, etc.), update `src/services/aiService.js`:

```javascript
export async function parseAITask(input, existingTasks = []) {
  // Replace with actual LLM API call
  const response = await fetch('YOUR_AI_API_ENDPOINT', {
    method: 'POST',
    body: JSON.stringify({ input, tasks: existingTasks })
  })
  return await response.json()
}
```

### Styling

All styles are modular CSS files:
- `src/index.css` - Global styles
- `src/App.css` - App layout
- `src/components/GanttChart.css` - Chart styles
- `src/components/AIAssistant.css` - AI panel styles

## 📝 Project Structure

```
├── src/
│   ├── components/
│   │   ├── GanttChart.jsx       # Excel-like table with timeline
│   │   ├── GanttChart.css
│   │   ├── AIAssistant.jsx      # Floating AI UI
│   │   ├── AIAssistant.css
│   │   ├── SheetTabs.jsx        # Multiple sheet tabs
│   │   └── SheetTabs.css
│   ├── services/
│   │   └── aiService.js         # Natural language parser
│   ├── App.jsx                  # Main app component
│   ├── App.css
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## 🎨 Design Philosophy

- **Dark theme** for reduced eye strain
- **Minimalist UI** - No clutter
- **Floating AI** - Always accessible, never in the way
- **Smooth animations** - Polished feel
- **Responsive** - Works on all screen sizes

## 📊 Column Details

The Gantt chart includes these customizable columns:

1. **Task** - Task name and status badge
2. **Start Date** - Task start date (MMM dd, yyyy format)
3. **Duration** - Automatically calculated days (e.g., "5 days")
4. **End Date** - Task end date (MMM dd, yyyy format)
5. **Owner** - Task owner/assignee
6. **Timeline** - Visual Gantt bar chart with today indicator

All columns can be hidden/shown by clicking the × button on column headers.

## 🔮 Future Enhancements

- [ ] Connect to real LLM API (OpenAI/Anthropic)
- [ ] Task dependencies and critical path
- [ ] Resource allocation
- [ ] Export to PDF/image
- [ ] Collaborative editing
- [ ] Task templates
- [ ] Calendar integration
- [ ] Drag-and-drop column reordering
- [ ] Column width resizing
- [ ] Data export (CSV, Excel)

## 📄 License

MIT License - Build freely!

---

Built with ❤️ using first principles thinking


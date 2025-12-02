import { useState, useRef, useEffect, useCallback } from 'react'
import './AIAssistant.css'

function AIAssistant({ onInput, isProcessing, activeSheetName = 'Main Project' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [messages, setMessages] = useState([])
  const recognitionRef = useRef(null)
  const inputRef = useRef(null)
  const handleSubmitRef = useRef(null)
  const addMessageRef = useRef(null)

  const addMessage = useCallback((text, type = 'user') => {
    const timestamp = Date.now()
    setMessages(prev => [...prev, { text, type, timestamp }])
    setTimeout(() => {
      setMessages(prev => prev.filter(m => m.timestamp !== timestamp))
    }, 5000)
  }, [])

  const handleSubmit = useCallback(async (text, inputType = 'text') => {
    const taskText = text || input
    if (!taskText.trim()) return

    addMessage(taskText, 'user')
    setInput('')
    
    setIsListening(false)
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    await onInput(taskText, inputType)
    addMessage('Processing your request...', 'system')
  }, [input, onInput, addMessage])

  // Keep refs updated with latest callbacks
  useEffect(() => {
    handleSubmitRef.current = handleSubmit
    addMessageRef.current = addMessage
  }, [handleSubmit, addMessage])

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event) => {
        if (event.results && event.results.length > 0 && event.results[0].length > 0) {
          const transcript = event.results[0][0].transcript
          setInput(transcript)
          if (handleSubmitRef.current) {
            handleSubmitRef.current(transcript, 'voice')
          }
        }
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        
        let errorMessage = 'Error with voice recognition. Please try typing instead.'
        if (event.error === 'not-allowed') {
          errorMessage = 'Microphone permission denied. Please allow microphone access and try again.'
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try again.'
        } else if (event.error === 'audio-capture') {
          errorMessage = 'No microphone found. Please check your microphone connection.'
        } else if (event.error === 'network') {
          errorMessage = 'Network error. Please check your connection and try again.'
        }
        
        if (addMessageRef.current) {
          addMessageRef.current(errorMessage, 'error')
        }
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.onstart = () => {
        setIsListening(true)
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore errors when stopping during cleanup
        }
      }
    }
  }, []) // Empty dependency array - only initialize once

  const startListening = () => {
    if (!recognitionRef.current) {
      addMessage('Voice recognition not supported in your browser.', 'error')
      return
    }

    // Check if already listening
    if (isListening) {
      return
    }

    try {
      // Stop any existing recognition first
      if (recognitionRef.current && recognitionRef.current.state !== 'inactive') {
        recognitionRef.current.stop()
      }
      
      // Small delay to ensure previous recognition is fully stopped
      setTimeout(() => {
        try {
          recognitionRef.current.start()
          addMessage('Listening...', 'system')
        } catch (error) {
          console.error('Error starting recognition:', error)
          setIsListening(false)
          if (error.message && error.message.includes('already started')) {
            addMessage('Voice recognition is already active.', 'error')
          } else {
            addMessage('Could not start voice recognition. Please try again.', 'error')
          }
        }
      }, 100)
    } catch (error) {
      console.error('Error starting recognition:', error)
      setIsListening(false)
      addMessage('Could not start voice recognition. Please try again.', 'error')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        if (recognitionRef.current.state !== 'inactive') {
          recognitionRef.current.stop()
        }
        setIsListening(false)
        addMessage('Stopped listening.', 'system')
      } catch (error) {
        console.error('Error stopping recognition:', error)
        setIsListening(false)
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(input, 'text')
    }
  }

  const handleExampleClick = (exampleText) => {
    handleSubmit(exampleText, 'text')
  }

  const handleSendClick = () => {
    handleSubmit(input, 'text')
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="ai-assistant-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Floating AI Button */}
      <div 
        className={`ai-assistant-toggle ${isOpen ? 'open' : ''} ${isProcessing ? 'processing' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
        </svg>
        <span className="ai-pulse"></span>
      </div>

      {/* AI Assistant Panel */}
      <div className={`ai-assistant-panel ${isOpen ? 'open' : ''}`}>
        <div className="ai-assistant-header">
          <div className="ai-assistant-title">
            <div className="ai-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h3>AI Assistant</h3>
              <p>{activeSheetName} • Voice or text input</p>
            </div>
          </div>
          <button 
            className="ai-close-btn"
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="ai-assistant-body">
          {messages.map((msg, idx) => (
            <div key={idx} className={`ai-message ${msg.type}`}>
              {msg.text}
            </div>
          ))}
          
          {isProcessing && (
            <div className="ai-message system">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div className="ai-examples">
            <p className="examples-title">Try saying:</p>
            <div className="example-items">
              <button 
                className="example-btn"
                onClick={() => handleExampleClick('Add task "Build landing page" from January 15 to January 25 assigned to John')}
              >
                "Add task Build landing page from Jan 15 to Jan 25 assigned to John"
              </button>
              <button 
                className="example-btn"
                onClick={() => handleExampleClick('Mark Build landing page as ongoing')}
              >
                "Mark Build landing page as ongoing"
              </button>
              <button 
                className="example-btn"
                onClick={() => handleExampleClick('Create new sheet called Marketing')}
              >
                "Create new sheet called Marketing"
              </button>
              <button 
                className="example-btn"
                onClick={() => handleExampleClick('Switch to Marketing sheet')}
              >
                "Switch to Marketing sheet"
              </button>
              <button 
                className="example-btn"
                onClick={() => handleExampleClick('Rename Marketing sheet to Sales Campaign')}
              >
                "Rename Marketing sheet to Sales Campaign"
              </button>
              <button 
                className="example-btn"
                onClick={() => handleExampleClick('Add column called Priority')}
              >
                "Add column called Priority"
              </button>
            </div>
          </div>
        </div>

        <div className="ai-assistant-footer">
          <div className="ai-input-container">
            <textarea
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type or speak your task..."
              rows="2"
            />
            <div className="ai-input-actions">
              <button
                className={`ai-voice-btn ${isListening ? 'listening' : ''}`}
                onClick={isListening ? stopListening : startListening}
                title={isListening ? 'Stop listening' : 'Start voice input'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
                  <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H3V12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12V10H19Z" fill="currentColor"/>
                  <path d="M11 22H13V24H11V22Z" fill="currentColor"/>
                </svg>
              </button>
              <button
                className="ai-send-btn"
                onClick={handleSendClick}
                disabled={!input.trim() || isProcessing}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AIAssistant


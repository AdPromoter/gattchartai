import { useState, useRef, useEffect } from 'react'
import './FileMenu.css'

function FileMenu({ onSave, onOpen, onExport, onImport }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (onSave) {
        await onSave()
      }
      setTimeout(() => {
        setIsSaving(false)
        setIsOpen(false)
      }, 500)
    } catch (error) {
      setIsSaving(false)
    }
  }

  const handleOpen = () => {
    if (onOpen) {
      onOpen()
    }
    setIsOpen(false)
  }

  const handleExport = () => {
    if (onExport) {
      onExport()
    }
    setIsOpen(false)
  }

  const handleImport = () => {
    if (onImport) {
      onImport()
    }
    setIsOpen(false)
  }

  return (
    <div className="file-menu" ref={menuRef}>
      <button 
        className="file-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="File menu"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        File
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className={isOpen ? 'dropdown-arrow open' : 'dropdown-arrow'}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {isOpen && (
        <div className="file-menu-dropdown">
          <button 
            className="file-menu-item"
            onClick={handleSave}
            disabled={isSaving}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
            <span className="file-menu-shortcut">Ctrl+S</span>
          </button>
          
          <button 
            className="file-menu-item"
            onClick={handleOpen}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Open</span>
            <span className="file-menu-shortcut">Ctrl+O</span>
          </button>
          
          <div className="file-menu-divider"></div>
          
          <button 
            className="file-menu-item"
            onClick={handleExport}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Export</span>
            <span className="file-menu-shortcut">Ctrl+E</span>
          </button>
          
          <button 
            className="file-menu-item"
            onClick={handleImport}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Import</span>
            <span className="file-menu-shortcut">Ctrl+I</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default FileMenu

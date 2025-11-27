import { useState } from 'react'
import './SheetTabs.css'

function SheetTabs({ sheets, activeSheetId, onSelectSheet, onAddSheet, onRenameSheet, onDeleteSheet }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  const handleRenameStart = (sheet) => {
    setEditingId(sheet.id)
    setEditName(sheet.name)
  }

  const handleRenameSubmit = (sheetId) => {
    if (editName.trim()) {
      onRenameSheet(sheetId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const handleKeyPress = (e, sheetId) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(sheetId)
    } else if (e.key === 'Escape') {
      setEditingId(null)
      setEditName('')
    }
  }

  return (
    <div className="sheet-tabs">
      <div className="sheet-tabs-container">
        {sheets.map((sheet) => (
          <div
            key={sheet.id}
            className={`sheet-tab ${activeSheetId === sheet.id ? 'active' : ''}`}
            onClick={() => !editingId && onSelectSheet(sheet.id)}
          >
            {editingId === sheet.id ? (
              <input
                type="text"
                className="sheet-tab-rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleRenameSubmit(sheet.id)}
                onKeyDown={(e) => handleKeyPress(e, sheet.id)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            ) : (
              <>
                <span className="sheet-tab-name">{sheet.name}</span>
                <div className="sheet-tab-actions">
                  <button
                    className="sheet-tab-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRenameStart(sheet)
                    }}
                    title="Rename sheet"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {sheets.length > 1 && (
                    <button
                      className="sheet-tab-btn delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Delete "${sheet.name}"?`)) {
                          onDeleteSheet(sheet.id)
                        }
                      }}
                      title="Delete sheet"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <button className="sheet-tab-add" onClick={onAddSheet} title="Add new sheet">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export default SheetTabs

